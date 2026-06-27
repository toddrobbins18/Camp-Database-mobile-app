import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Alert, ActivityIndicator, useWindowDimensions, Platform, Switch, Share } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView as GHScrollView, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { ModalPickerOverlay } from '../components/ModalPickerOverlay';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';
import { useStaff } from '../api/staff';
import { isTylerHillCamp } from '../constants/camps';
import { enqueueSync, isOnlineNow } from '../offline/engine';
import {
    buildNightOffScheduleDateRange,
    formatNightOffScheduleLabel,
    mergeNightOffScheduleEntries,
    type NightOffScheduleEntry,
    staffIsScheduledOff,
    shouldRemoveDayOffRecord,
} from '../lib/odNightOffSchedule';
import {
    bunkMatchesOdGenderFilter,
    sortOdRowsByGenderThenBunkNumber,
    type OdGenderFilter,
} from '../lib/odManagementUtils';
import {
    importStaffDaysOffSchedule,
    STAFF_DAYS_OFF_CSV_TEMPLATE,
    type StaffDaysOffCsvUploadResult,
} from '../lib/staffDaysOffCsvImport';

interface StaffMember {
    id: string;
    name: string;
    bunk: string;
    isOut: boolean;
    isIn: boolean;
    isSleepingOut: boolean;
    /** Matches web: on duty = not marked day off */
    isDayOff: boolean;
    isNightOff: boolean;
    staffId: string;
    bunkId: string;
    dayOffId?: string;
}

interface BunkRow {
    id: string;
    bunk_number: string;
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
    const { width, height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isCompactModal = width < 560;
    const bunkModalMaxHeight = Math.round(windowHeight * 0.9);

    const [activeTab, setActiveTab] = useState<'OD' | 'OFF' | 'FREE_PLAY'>('OD');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    /** Matches web ODManagement.tsx `genderFilter` */
    const [genderFilter, setGenderFilter] = useState<OdGenderFilter>('all');
    const [showManageBunksModal, setShowManageBunksModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [newBunkNumber, setNewBunkNumber] = useState('1');
    const [newBunkName, setNewBunkName] = useState('');
    /** Matches web BunkManagement: "none" = no division */
    const [newBunkDivision, setNewBunkDivision] = useState<string>('none');
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

    const [showManageNightsModal, setShowManageNightsModal] = useState(false);
    const [manageNightsStaffId, setManageNightsStaffId] = useState<string | null>(null);
    const [manageNightsStaffName, setManageNightsStaffName] = useState('');
    const [nightOffSchedule, setNightOffSchedule] = useState<NightOffScheduleEntry[]>([]);
    const [loadingNightSchedule, setLoadingNightSchedule] = useState(false);
    const [savingNightDate, setSavingNightDate] = useState<string | null>(null);

    const [showScheduleUploadModal, setShowScheduleUploadModal] = useState(false);
    const [scheduleUploading, setScheduleUploading] = useState(false);
    const [scheduleUploadResult, setScheduleUploadResult] = useState<StaffDaysOffCsvUploadResult | null>(null);

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
                // Keep parity with web list behavior and include legacy rows where is_active may be null.
                .or('is_active.eq.true,is_active.is.null')
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
                .insert([{
                    company_id: companyId,
                    season,
                    bunk_number: bunkNumber,
                    bunk_name: bunkName || null,
                    division_id: newBunkDivision === 'none' ? null : newBunkDivision,
                    is_active: true,
                }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bunks'] });
            setNewBunkName('');
            setNewBunkDivision('none');
        },
        onError: (error: any) => {
            if (error?.code === '23505') {
                Alert.alert('Duplicate bunk number', 'That bunk number already exists for this season.');
                return;
            }
            const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join('\n');
            console.error('bunks insert failed:', error);
            Alert.alert('Error', detail || 'Failed to add bunk');
        },
    });

    /** Bunk delete — use native Alert (nested RN Modals often fail to show/touch when Manage Bunks modal is open). */
    const performBunkDelete = async (bunkId: string) => {
        if (!companyId || !season) return;
        try {
            const { error: unassignErr } = await supabase
                .from('bunk_staff')
                .delete()
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('bunk_id', bunkId);
            if (unassignErr) throw unassignErr;

            const { error: archiveErr } = await supabase
                .from('bunks')
                .update({ is_active: false })
                .eq('id', bunkId)
                .eq('company_id', companyId)
                .eq('season', season);
            if (archiveErr) throw archiveErr;

            if (selectedBunkForStaff === bunkId) {
                setSelectedBunkForStaff(null);
                setSelectedStaffToAdd('');
                setShowStaffPickerForBunk(null);
            }

            await queryClient.invalidateQueries({ queryKey: ['bunks'] });
            await queryClient.invalidateQueries({ queryKey: ['bunk_staff'] });
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            Alert.alert('Success', 'Bunk deleted.');
        } catch (err: any) {
            console.error('[DELETE] Error:', err);
            Alert.alert('Delete failed', err.message || 'Unknown error');
        }
    };

    const handleDeleteBunk = (bunkId: string, displayName: string) => {
        const label = displayName?.trim() || 'this bunk';
        Alert.alert(
            'Delete bunk?',
            `Remove "${label}" and unassign all staff from this bunk? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        void performBunkDelete(bunkId);
                    },
                },
            ]
        );
    };

    const assignStaffToBunkMutation = useMutation({
        mutationFn: async ({ bunkId, staffId }: { bunkId: string; staffId: string }) => {
            const row = { company_id: companyId, season, bunk_id: bunkId, staff_id: staffId, is_primary: false };
            if (await isOnlineNow()) {
                const { error } = await supabase
                    .from('bunk_staff')
                    .insert([row]);
                if (error) throw error;
            } else {
                await enqueueSync('bunk_staff.insert', [row]);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['bunk_staff'] });
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            await queryClient.invalidateQueries({ queryKey: ['staff'] });
            setSelectedStaffToAdd('');
            setShowStaffPickerForBunk(null);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to assign staff');
        },
    });

    const removeStaffFromBunkMutation = useMutation({
        mutationFn: async (bunkStaffId: string) => {
            if (await isOnlineNow()) {
                const { error } = await supabase.from('bunk_staff').delete().eq('id', bunkStaffId);
                if (error) throw error;
            } else {
                await enqueueSync('bunk_staff.delete', { id: bunkStaffId });
            }
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

    const staffMembers: StaffMember[] = sortOdRowsByGenderThenBunkNumber(
        (bunkStaffList || [])
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
                    isNightOff: !!dayOff?.is_night_off,
                };
            })
            .filter(Boolean) as StaffMember[],
        (staff) => bunkById.get(staff.bunkId),
        (staff) => bunkById.get(staff.bunkId)?.bunk_number,
    );

    const filteredStaff = sortOdRowsByGenderThenBunkNumber(
        staffMembers.filter((staff) => {
            if (searchQuery && !staff.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !staff.bunk.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            const bunk = bunkById.get(staff.bunkId);
            if (!bunkMatchesOdGenderFilter(bunk, genderFilter)) return false;
            if (activeTab === 'OD') return !staff.isDayOff;
            if (activeTab === 'OFF') return staff.isDayOff || staff.isNightOff;
            if (activeTab === 'FREE_PLAY') return staff.isSleepingOut;
            return true;
        }),
        (staff) => bunkById.get(staff.bunkId),
        (staff) => bunkById.get(staff.bunkId)?.bunk_number,
    );

    useEffect(() => {
        if (!showFreePlay && activeTab === 'FREE_PLAY') setActiveTab('OD');
    }, [showFreePlay, activeTab]);

    const handleManageBunks = () => {
        setBunkModalTab('manage');
        setCsvUploadResult(null);
        setShowDivisionPickerModal(false);
        setShowStaffPickerForBunk(null);
        setShowManageBunksModal(true);
    };

    const closeManageBunksModal = () => {
        setShowManageBunksModal(false);
        setShowDivisionPickerModal(false);
        setShowStaffPickerForBunk(null);
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
        const maxBunk = bunksList.length 
            ? Math.max(...bunksList.map((b) => {
                const n = parseInt(b.bunk_number);
                return isNaN(n) ? 0 : n;
            }))
            : 0;
        const nextBunkNumber = (maxBunk + 1).toString();
        setNewBunkNumber((prev) => {
            if (!prev || prev === '1') return nextBunkNumber;
            return prev;
        });
    }, [showManageBunksModal, bunksList]);

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
            const bunkByNumber = new Map<string, string>();
            (bunkRows || []).forEach((b: any) => bunkByNumber.set(String(b.bunk_number).trim(), b.id));

            const summary: CsvUploadResult = { success: 0, failed: 0, errors: [] };
            for (let i = 1; i < lines.length; i += 1) {
                const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
                const personId = String(values[personIdx] || '').toLowerCase().trim();
                const bunkNumber = String(values[bunkIdx] || '').trim();
                const isPrimaryRaw = String(values[primaryIdx] || '').toLowerCase();
                const isPrimary = ['true', '1', 'yes', 'y'].includes(isPrimaryRaw);
                if (!personId || !bunkNumber) {
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
            const { data: row } = await supabase
                .from('staff_days_off')
                .select('id, is_day_off, is_night_off, checked_out, checked_in')
                .eq('staff_id', staffMember.id)
                .eq('company_id', companyId)
                .eq('date', dateString)
                .maybeSingle();
            if (!row || !staffIsScheduledOff(row)) {
                setLateOverrideStaffId(staffMember.id);
                setShowLateOverrideModal(true);
                setRfidInput('');
                return;
            }
            if (!row.checked_out) {
                const update = { checked_out: true, checked_out_at: new Date().toISOString() };
                if (await isOnlineNow()) {
                    await supabase.from('staff_days_off').update(update).eq('id', row.id);
                } else {
                    await enqueueSync('staff_days_off.update', { id: row.id, update });
                }
                Alert.alert('Checked out', `${staffMember.name} signed out.`);
            } else if (!row.checked_in) {
                const update = { checked_in: true, checked_in_at: new Date().toISOString() };
                if (await isOnlineNow()) {
                    await supabase.from('staff_days_off').update(update).eq('id', row.id);
                } else {
                    await enqueueSync('staff_days_off.update', { id: row.id, update });
                }
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

    const handleToggleDayOff = async (staffId: string, field: 'is_day_off' | 'is_night_off' | 'is_sleeping_out') => {
        if (!companyId || !season) return;
        const existing = (staffDaysOff as any[]).find((d) => d.staff_id === staffId);
        try {
            if (existing) {
                const cur = !!existing[field];
                const newValue = !cur;
                const updates: Record<string, boolean> = { [field]: newValue };
                const merged = { ...existing, ...updates };
                if (shouldRemoveDayOffRecord(merged)) {
                    if (await isOnlineNow()) {
                        const { error } = await supabase.from('staff_days_off').delete().eq('id', existing.id);
                        if (error) throw error;
                    } else {
                        await enqueueSync('staff_days_off.delete', { id: existing.id });
                    }
                } else if (await isOnlineNow()) {
                    const { error } = await supabase.from('staff_days_off').update(updates).eq('id', existing.id);
                    if (error) throw error;
                } else {
                    await enqueueSync('staff_days_off.update', { id: existing.id, update: updates });
                }
            } else {
                const newRecord = {
                    company_id: companyId,
                    staff_id: staffId,
                    date: dateString,
                    season,
                    is_day_off: field === 'is_day_off',
                    is_night_off: field === 'is_night_off',
                    is_sleeping_out: field === 'is_sleeping_out',
                };
                if (await isOnlineNow()) {
                    const { error } = await supabase.from('staff_days_off').insert(newRecord);
                    if (error) throw error;
                } else {
                    await enqueueSync('staff_days_off.insert', [newRecord]);
                }
            }
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not update');
        }
    };

    const loadNightOffSchedule = async (staffId: string) => {
        if (!companyId || !season) return;
        setLoadingNightSchedule(true);
        try {
            const rangeDates = buildNightOffScheduleDateRange(selectedDate);
            const startDate = rangeDates[0];
            const endDate = rangeDates[rangeDates.length - 1];
            const { data, error } = await supabase
                .from('staff_days_off')
                .select('id, date, is_day_off, is_night_off, is_sleeping_out, checked_out, checked_in')
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('staff_id', staffId)
                .gte('date', startDate)
                .lte('date', endDate);
            if (error) throw error;
            setNightOffSchedule(mergeNightOffScheduleEntries(rangeDates, data || []));
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not load night schedule');
        } finally {
            setLoadingNightSchedule(false);
        }
    };

    const openManageNights = (staffId: string, staffName: string) => {
        setManageNightsStaffId(staffId);
        setManageNightsStaffName(staffName);
        setShowManageNightsModal(true);
        void loadNightOffSchedule(staffId);
    };

    const handleSetNightOffForDate = async (staffId: string, dateYmd: string, enabled: boolean) => {
        if (!companyId || !season) return;
        setSavingNightDate(dateYmd);
        try {
            const { data: existing, error: fetchError } = await supabase
                .from('staff_days_off')
                .select('id, is_day_off, is_night_off, is_sleeping_out, checked_out, checked_in')
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('staff_id', staffId)
                .eq('date', dateYmd)
                .maybeSingle();
            if (fetchError) throw fetchError;

            if (enabled) {
                if (existing) {
                    const update = { is_night_off: true };
                    if (await isOnlineNow()) {
                        const { error } = await supabase.from('staff_days_off').update(update).eq('id', existing.id);
                        if (error) throw error;
                    } else {
                        await enqueueSync('staff_days_off.update', { id: existing.id, update });
                    }
                } else {
                    const newRecord = {
                        company_id: companyId,
                        staff_id: staffId,
                        date: dateYmd,
                        season,
                        is_day_off: false,
                        is_night_off: true,
                        is_sleeping_out: false,
                    };
                    if (await isOnlineNow()) {
                        const { error } = await supabase.from('staff_days_off').insert(newRecord);
                        if (error) throw error;
                    } else {
                        await enqueueSync('staff_days_off.insert', [newRecord]);
                    }
                }
            } else if (existing) {
                const nextRecord = { ...existing, is_night_off: false };
                if (shouldRemoveDayOffRecord(nextRecord)) {
                    if (await isOnlineNow()) {
                        const { error } = await supabase.from('staff_days_off').delete().eq('id', existing.id);
                        if (error) throw error;
                    } else {
                        await enqueueSync('staff_days_off.delete', { id: existing.id });
                    }
                } else {
                    const update = { is_night_off: false };
                    if (await isOnlineNow()) {
                        const { error } = await supabase.from('staff_days_off').update(update).eq('id', existing.id);
                        if (error) throw error;
                    } else {
                        await enqueueSync('staff_days_off.update', { id: existing.id, update });
                    }
                }
            }

            await loadNightOffSchedule(staffId);
            if (dateYmd === dateString) {
                await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            }
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not update night off');
        } finally {
            setSavingNightDate(null);
        }
    };

    const handleUploadScheduleCsv = async () => {
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

            setScheduleUploading(true);
            setScheduleUploadResult(null);

            const csvText = await (await fetch(file.uri)).text();
            const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
            if (lines.length < 2) {
                Alert.alert('Invalid file', 'CSV is empty or missing data rows.');
                return;
            }

            const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());
            const rows = lines.slice(1).map((line) => {
                const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
                const obj: Record<string, unknown> = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] ?? null;
                });
                return obj;
            });

            const summary = await importStaffDaysOffSchedule(supabase, {
                companyId,
                season,
                rows,
            });
            setScheduleUploadResult(summary);
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });

            if (summary.success > 0) {
                Alert.alert('Upload complete', `Imported ${summary.success} schedule row(s).`);
            }
            if (summary.failed > 0 && summary.success === 0) {
                Alert.alert('Upload failed', summary.errors[0] || `${summary.failed} row(s) failed.`);
            }
        } catch (error: any) {
            Alert.alert('Upload failed', error?.message || 'Failed to process CSV file');
        } finally {
            setScheduleUploading(false);
        }
    };

    const shareScheduleTemplate = async () => {
        try {
            await Share.share({
                message: STAFF_DAYS_OFF_CSV_TEMPLATE,
                title: 'staff_days_off_template.csv',
            });
        } catch {
            Alert.alert('Template', STAFF_DAYS_OFF_CSV_TEMPLATE);
        }
    };

    const handleApproveLateOverride = async () => {
        if (!lateOverrideStaffId || !companyId) return;
        if (!lateOverrideReason.trim()) {
            Alert.alert('Reason required', 'Please enter a reason for this late sign-out override.');
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        const row = {
            company_id: companyId,
            staff_id: lateOverrideStaffId,
            date: dateString,
            season,
            is_day_off: true,
            is_night_off: false,
            checked_out: true,
            checked_out_at: new Date().toISOString(),
            checked_out_by: user?.id ?? null,
            late_override: true,
            late_override_reason: lateOverrideReason.trim(),
            late_override_approved_by: user?.id ?? null,
            late_override_approved_at: new Date().toISOString(),
        };
        if (await isOnlineNow()) {
            const { error } = await supabase
                .from('staff_days_off')
                .upsert(row, { onConflict: 'company_id,staff_id,date,season' });
            if (error) {
                Alert.alert('Error', error.message || 'Failed to approve override');
                return;
            }
        } else {
            await enqueueSync('staff_days_off.upsert', { row });
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
                        onPress={() => {
                            setScheduleUploadResult(null);
                            setShowScheduleUploadModal(true);
                        }}
                    >
                        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>Upload Schedule</Text>
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
                    <View style={styles.scannerPanel}>
                        <View style={styles.scannerPanelRow}>
                            <View style={styles.scannerPanelLeft}>
                                <Text style={styles.scannerPanelLabel}>
                                    Ready to scan wristband - Staff will be checked in/out automatically
                                </Text>
                                <TextInput
                                    ref={rfidInputRef}
                                    style={styles.scannerInputField}
                                    placeholder="Scan wristband or enter RFID..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={rfidInput}
                                    onChangeText={setRfidInput}
                                    onSubmitEditing={handleRfidScan}
                                    editable={!isScanning}
                                    autoFocus
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.scannerSubmitButton, (!rfidInput.trim() || isScanning) && { opacity: 0.6 }]}
                                onPress={handleRfidScan}
                                disabled={!rfidInput.trim() || isScanning}
                                activeOpacity={0.85}
                            >
                                {isScanning ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.scannerSubmitText}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
                                      ? 'No staff with a day off or night off today.'
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
                            {filteredStaff.map((staff) => (
                                <View key={staff.id} style={styles.offStaffCard}>
                                    <View style={styles.offStaffCardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.offStaffName}>{staff.name}</Text>
                                            <Text style={styles.offStaffBunk}>{staff.bunk}</Text>
                                            <View style={styles.offStaffBadges}>
                                                {staff.isDayOff ? (
                                                    <View style={styles.dayOffBadge}>
                                                        <Text style={styles.dayOffBadgeText}>Day Off</Text>
                                                    </View>
                                                ) : null}
                                                {staff.isNightOff ? (
                                                    <View style={styles.nightOffBadge}>
                                                        <Text style={styles.nightOffBadgeText}>Night Off</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.offStaffActions}>
                                        <TouchableOpacity
                                            style={styles.manageNightsBtn}
                                            onPress={() => openManageNights(staff.staffId, staff.name)}
                                        >
                                            <Ionicons name="moon-outline" size={16} color={theme.colors.primary} />
                                            <Text style={styles.manageNightsBtnText}>Manage Nights</Text>
                                        </TouchableOpacity>
                                        {staff.isDayOff ? (
                                            <TouchableOpacity
                                                onPress={() => handleToggleDayOff(staff.staffId, 'is_day_off')}
                                                hitSlop={8}
                                            >
                                                <Text style={styles.removeLink}>Remove Day Off</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                        {staff.isNightOff && !staff.isDayOff ? (
                                            <TouchableOpacity
                                                onPress={() => handleToggleDayOff(staff.staffId, 'is_night_off')}
                                                hitSlop={8}
                                            >
                                                <Text style={styles.removeLink}>Remove Night Off</Text>
                                            </TouchableOpacity>
                                        ) : null}
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
                                    <View style={{ flex: 1.4, alignItems: 'flex-end', gap: 6 }}>
                                        <TouchableOpacity
                                            style={[styles.markOffPill, { backgroundColor: theme.colors.secondary }]}
                                            onPress={() => handleToggleDayOff(staff.staffId, 'is_day_off')}
                                        >
                                            <Text style={styles.markOffPillText}>Mark Off</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.markOffPill,
                                                staff.isNightOff
                                                    ? { backgroundColor: theme.colors.primary }
                                                    : { backgroundColor: '#e5e7eb' },
                                            ]}
                                            onPress={() => handleToggleDayOff(staff.staffId, 'is_night_off')}
                                        >
                                            <Text
                                                style={[
                                                    styles.markOffPillText,
                                                    !staff.isNightOff && { color: theme.colors.text },
                                                ]}
                                            >
                                                {staff.isNightOff ? 'Remove Night Off' : 'Night Off'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>
            </ScrollView>


            {/* Manage Bunks Modal */}
            <Modal
                visible={showManageBunksModal}
                transparent={true}
                animationType="fade"
                onRequestClose={closeManageBunksModal}
            >
                <View style={styles.modalOverlayCenter}>
                    <Pressable
                        style={StyleSheet.absoluteFillObject}
                        onPress={closeManageBunksModal}
                        accessibilityRole="button"
                        accessibilityLabel="Close bunk management"
                    />
                    <View
                        style={[
                            styles.bunkModal,
                            {
                                height: bunkModalMaxHeight,
                                maxHeight: bunkModalMaxHeight,
                                zIndex: 2,
                                elevation: 8,
                            },
                        ]}
                    >
                        <GestureHandlerRootView style={styles.bunkModalGestureRoot}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Bunk Management</Text>
                            <TouchableOpacity onPress={closeManageBunksModal}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.bunkModalBody}>
                        <GHScrollView
                            style={styles.bunkModalScroll}
                            contentContainerStyle={[
                                styles.bunkModalScrollContent,
                                { paddingBottom: 20 + insets.bottom },
                            ]}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                            bounces
                        >
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
                                            <Text style={styles.bunkFormLabel}>Bunk Number</Text>
                                            <TextInput
                                                style={styles.bunkFormInput}
                                                keyboardType="number-pad"
                                                value={newBunkNumber}
                                                onChangeText={setNewBunkNumber}
                                            />
                                        </View>
                                        <View style={styles.addBunkFieldCompact}>
                                            <Text style={styles.bunkFormLabel}>Bunk Name (optional)</Text>
                                            <TextInput
                                                style={styles.bunkFormInput}
                                                placeholder="e.g., Bunk A, Senior Boys 1"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={newBunkName}
                                                onChangeText={setNewBunkName}
                                                onSubmitEditing={handleAddBunk}
                                            />
                                        </View>
                                        <View style={styles.addBunkFieldCompact}>
                                            <Text style={styles.bunkFormLabel}>Division (optional)</Text>
                                            <TouchableOpacity style={[styles.bunkFormInput, styles.selectInput]} onPress={() => setShowDivisionPickerModal(true)}>
                                                <Text style={styles.selectInputText} numberOfLines={1}>
                                                    {newBunkDivision === 'none'
                                                        ? 'None'
                                                        : (divisionsList.find((d: any) => d.id === newBunkDivision)?.name || 'None')}
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
                                            <Text style={styles.bunkFormLabel}>Bunk Number</Text>
                                            <TextInput
                                                style={styles.bunkFormInput}
                                                keyboardType="number-pad"
                                                value={newBunkNumber}
                                                onChangeText={setNewBunkNumber}
                                            />
                                        </View>
                                        <View style={styles.addBunkField}>
                                            <Text style={styles.bunkFormLabel}>Bunk Name (optional)</Text>
                                            <TextInput
                                                style={styles.bunkFormInput}
                                                placeholder="e.g., Bunk A, Senior Boys 1"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={newBunkName}
                                                onChangeText={setNewBunkName}
                                                onSubmitEditing={handleAddBunk}
                                            />
                                        </View>
                                        <View style={styles.addBunkField}>
                                            <Text style={styles.bunkFormLabel}>Division (optional)</Text>
                                            <TouchableOpacity style={[styles.bunkFormInput, styles.selectInput]} onPress={() => setShowDivisionPickerModal(true)}>
                                                <Text style={styles.selectInputText} numberOfLines={1}>
                                                    {newBunkDivision === 'none'
                                                        ? 'None'
                                                        : (divisionsList.find((d: any) => d.id === newBunkDivision)?.name || 'None')}
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

                            {isCompactModal ? (
                                <View style={styles.bunkAssignCardList}>
                                    {bunksList.map((b) => {
                                        const assigned = bunkStaffList.filter((bs) => bs.bunk_id === b.id);
                                        const division = b.division_id ? divisionsList.find((d: any) => d.id === b.division_id) : null;
                                        const divisionName = division?.name || '-';
                                        return (
                                            <View key={b.id} style={styles.bunkAssignCard}>
                                                <View style={styles.bunkAssignCardHeader}>
                                                    <Text style={styles.bunkAssignCardTitle}>Bunk #{b.bunk_number}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteBunk(b.id, b.bunk_name || `Bunk ${b.bunk_number}`)}
                                                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Delete bunk ${b.bunk_number}`}
                                                    >
                                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={styles.bunkAssignMetaLine}>
                                                    <Text style={styles.bunkAssignMetaLabel}>Name: </Text>
                                                    <Text style={styles.bunkAssignMetaValue}>{b.bunk_name || '—'}</Text>
                                                </Text>
                                                <View style={styles.bunkAssignDivisionRow}>
                                                    <Text style={styles.bunkAssignMetaLabel}>Division: </Text>
                                                    {division ? (
                                                        <View style={styles.divisionBadge}>
                                                            <Text style={styles.divisionBadgeText} numberOfLines={2}>
                                                                {divisionName}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.bunkTableCellMuted}>—</Text>
                                                    )}
                                                </View>
                                                <Text style={styles.bunkAssignSectionLabel}>Assigned Staff</Text>
                                                <View style={styles.assignedStaffRow}>
                                                    {assigned.map((bs) => (
                                                        <View key={bs.id} style={styles.staffChipOutline}>
                                                            <Text style={styles.staffChipOutlineText} numberOfLines={1}>
                                                                {bs.staff?.name || 'Unknown'}
                                                            </Text>
                                                            <TouchableOpacity onPress={() => removeStaffFromBunkMutation.mutate(bs.id)} hitSlop={6}>
                                                                <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    ))}
                                                    <TouchableOpacity
                                                        style={styles.iconAddStaffBtn}
                                                        onPress={() => {
                                                            setSelectedBunkForStaff(b.id);
                                                            setSelectedStaffToAdd('');
                                                        }}
                                                        hitSlop={6}
                                                    >
                                                        <Ionicons name="person-add-outline" size={18} color={theme.colors.text} />
                                                    </TouchableOpacity>
                                                </View>
                                                {selectedBunkForStaff === b.id ? (
                                                    <View style={styles.bunkAssignEditBlock}>
                                                        <TouchableOpacity
                                                            style={[styles.bunkFormInput, styles.selectInput, styles.bunkAssignSelectFull]}
                                                            onPress={() => setShowStaffPickerForBunk(b.id)}
                                                        >
                                                            <Text style={[styles.selectInputText, { flex: 1 }]} numberOfLines={1}>
                                                                {selectedStaffToAdd
                                                                    ? ((staffList || []).find((s: any) => s.id === selectedStaffToAdd)?.name ||
                                                                          'Select staff...')
                                                                    : 'Select staff...'}
                                                            </Text>
                                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                                        </TouchableOpacity>
                                                        <View style={styles.bunkAssignBtnRow}>
                                                            <TouchableOpacity
                                                                style={[styles.smallActionBtn, styles.bunkAssignBtnHalf, !selectedStaffToAdd && { opacity: 0.6 }]}
                                                                disabled={!selectedStaffToAdd}
                                                                onPress={() =>
                                                                    assignStaffToBunkMutation.mutate({ bunkId: b.id, staffId: selectedStaffToAdd })
                                                                }
                                                            >
                                                                <Text style={styles.smallActionBtnText}>Add</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={[styles.smallActionBtn, styles.bunkAssignBtnHalf, { backgroundColor: '#e5e7eb' }]}
                                                                onPress={() => {
                                                                    setSelectedBunkForStaff(null);
                                                                    setSelectedStaffToAdd('');
                                                                    setShowStaffPickerForBunk(null);
                                                                }}
                                                            >
                                                                <Text style={[styles.smallActionBtnText, { color: theme.colors.text }]}>Cancel</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                    {bunksList.length === 0 ? (
                                        <View style={styles.bunkEmptyRowCompact}>
                                            <Text style={styles.bunkEmptyText}>No bunks configured yet. Add your first bunk above.</Text>
                                        </View>
                                    ) : null}
                                </View>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator
                                    style={styles.bunksHScroll}
                                    nestedScrollEnabled
                                    keyboardShouldPersistTaps="handled"
                                >
                                    <View style={styles.bunkTableSheet}>
                                        <View style={styles.bunkTableHeaderRow}>
                                            <Text style={[styles.bunkTableHeadCell, styles.bunkColNum]}>Bunk #</Text>
                                            <Text style={[styles.bunkTableHeadCell, styles.bunkColName]}>Name</Text>
                                            <Text style={[styles.bunkTableHeadCell, styles.bunkColDiv]}>Division</Text>
                                            <Text style={[styles.bunkTableHeadCell, styles.bunkColStaff]}>Assigned Staff</Text>
                                            <Text style={[styles.bunkTableHeadCell, styles.bunkColAct]}>Actions</Text>
                                        </View>
                                        {bunksList.map((b) => {
                                            const assigned = bunkStaffList.filter((bs) => bs.bunk_id === b.id);
                                            const division = b.division_id ? divisionsList.find((d: any) => d.id === b.division_id) : null;
                                            const divisionName = division?.name || '-';
                                            return (
                                                <View key={b.id} style={styles.bunkTableDataRow}>
                                                    <Text style={[styles.bunkTableCell, styles.bunkColNum, styles.bunkTableCellStrong]}>{b.bunk_number}</Text>
                                                    <Text style={[styles.bunkTableCell, styles.bunkColName]} numberOfLines={2}>
                                                        {b.bunk_name || '-'}
                                                    </Text>
                                                    <View style={[styles.bunkColDiv, styles.bunkColDivWrap]}>
                                                        {division ? (
                                                            <View style={styles.divisionBadge}>
                                                                <Text style={styles.divisionBadgeText} numberOfLines={1}>
                                                                    {divisionName}
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={styles.bunkTableCellMuted}>-</Text>
                                                        )}
                                                    </View>
                                                    <View style={[styles.bunkColStaff, styles.bunkStaffCellWide]}>
                                                        <View style={styles.assignedStaffRow}>
                                                            {assigned.map((bs) => (
                                                                <View key={bs.id} style={styles.staffChipOutline}>
                                                                    <Text style={styles.staffChipOutlineText} numberOfLines={1}>
                                                                        {bs.staff?.name || 'Unknown'}
                                                                    </Text>
                                                                    <TouchableOpacity onPress={() => removeStaffFromBunkMutation.mutate(bs.id)} hitSlop={6}>
                                                                        <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            ))}
                                                            <TouchableOpacity
                                                                style={styles.iconAddStaffBtn}
                                                                onPress={() => {
                                                                    setSelectedBunkForStaff(b.id);
                                                                    setSelectedStaffToAdd('');
                                                                }}
                                                                hitSlop={6}
                                                            >
                                                                <Ionicons name="person-add-outline" size={18} color={theme.colors.text} />
                                                            </TouchableOpacity>
                                                        </View>
                                                        {selectedBunkForStaff === b.id ? (
                                                            <View style={styles.assignStaffStack}>
                                                                <TouchableOpacity
                                                                    style={[styles.bunkFormInput, styles.selectInput, styles.assignStaffSelectWide]}
                                                                    onPress={() => setShowStaffPickerForBunk(b.id)}
                                                                >
                                                                    <Text style={[styles.selectInputText, { flex: 1 }]} numberOfLines={1}>
                                                                        {selectedStaffToAdd
                                                                            ? ((staffList || []).find((s: any) => s.id === selectedStaffToAdd)?.name ||
                                                                                  'Select staff...')
                                                                            : 'Select staff...'}
                                                                    </Text>
                                                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                                                </TouchableOpacity>
                                                                <View style={styles.assignStaffBtnRow}>
                                                                    <TouchableOpacity
                                                                        style={[styles.smallActionBtn, !selectedStaffToAdd && { opacity: 0.6 }]}
                                                                        disabled={!selectedStaffToAdd}
                                                                        onPress={() =>
                                                                            assignStaffToBunkMutation.mutate({ bunkId: b.id, staffId: selectedStaffToAdd })
                                                                        }
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
                                                                        <Text style={[styles.smallActionBtnText, { color: theme.colors.text }]}>✕</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    <View style={[styles.bunkColAct, styles.bunkActCell]}>
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteBunk(b.id, b.bunk_name || `Bunk ${b.bunk_number}`)}
                                                            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`Delete bunk ${b.bunk_number}`}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                        {bunksList.length === 0 ? (
                                            <View style={styles.bunkEmptyRow}>
                                                <Text style={styles.bunkEmptyText}>No bunks configured yet. Add your first bunk above.</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </ScrollView>
                            )}
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
                        </GHScrollView>
                            <View style={[styles.bunkFooter, { paddingBottom: Math.max(10, insets.bottom) }]}>
                                <TouchableOpacity style={styles.doneButton} onPress={closeManageBunksModal}>
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        </GestureHandlerRootView>
                    </View>

                        <ModalPickerOverlay
                            visible={showDivisionPickerModal}
                            onClose={() => setShowDivisionPickerModal(false)}
                            title="Division (optional)"
                        >
                            <ScrollView keyboardShouldPersistTaps="handled" style={styles.bunkPickerScroll}>
                                <TouchableOpacity
                                    style={[styles.pickerOption, styles.pickerOptionRow]}
                                    onPress={() => {
                                        setNewBunkDivision('none');
                                        setShowDivisionPickerModal(false);
                                    }}
                                >
                                    <Text style={[styles.pickerOptionText, { flex: 1 }]}>None</Text>
                                    {newBunkDivision === 'none' ? (
                                        <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                    ) : null}
                                </TouchableOpacity>
                                {divisionsList.map((d: any) => (
                                    <TouchableOpacity
                                        key={d.id}
                                        style={[styles.pickerOption, styles.pickerOptionRow]}
                                        onPress={() => {
                                            setNewBunkDivision(d.id);
                                            setShowDivisionPickerModal(false);
                                        }}
                                    >
                                        <Text style={[styles.pickerOptionText, { flex: 1 }]} numberOfLines={2}>
                                            {d.name}
                                        </Text>
                                        {newBunkDivision === d.id ? (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                        ) : null}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </ModalPickerOverlay>

                        <ModalPickerOverlay
                            visible={!!showStaffPickerForBunk}
                            onClose={() => setShowStaffPickerForBunk(null)}
                            title="Select staff"
                        >
                            <ScrollView keyboardShouldPersistTaps="handled" style={styles.bunkPickerScroll}>
                                {(staffList || [])
                                    .filter((s: any) => !bunkStaffList.some((bs) => bs.staff_id === s.id))
                                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
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
                        </ModalPickerOverlay>
                </View>
            </Modal>

            {/* Upload Schedule Modal */}
            <Modal
                visible={showScheduleUploadModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowScheduleUploadModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowScheduleUploadModal(false)}>
                    <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Upload Day & Night Off Schedule</Text>
                            <TouchableOpacity onPress={() => setShowScheduleUploadModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent}>
                            <Text style={styles.modalSubtitle}>
                                Bulk-import staff day offs and night offs by Person ID and date. One row per staff member per date.
                            </Text>
                            <View style={styles.scheduleUploadHelp}>
                                <Text style={styles.scheduleUploadHelpTitle}>CSV columns</Text>
                                <Text style={styles.scheduleUploadHelpText}>Person ID, Date, Day Off (yes/no), Night Off (yes/no), Notes (optional)</Text>
                                <Text style={[styles.scheduleUploadHelpText, { marginTop: 8 }]}>
                                    Example: day off Wednesday (yes/no) plus night offs on other dates as separate rows with Night Off = yes.
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.scheduleTemplateBtn} onPress={() => void shareScheduleTemplate()}>
                                <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.scheduleTemplateBtnText}>Share CSV Template</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.scheduleUploadBtn, scheduleUploading && { opacity: 0.65 }]}
                                onPress={() => void handleUploadScheduleCsv()}
                                disabled={scheduleUploading}
                            >
                                {scheduleUploading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                                        <Text style={styles.scheduleUploadBtnText}>Choose CSV File</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            {scheduleUploadResult && scheduleUploadResult.errors.length > 0 ? (
                                <View style={styles.scheduleUploadErrors}>
                                    <Text style={styles.scheduleUploadErrorsTitle}>
                                        {scheduleUploadResult.failed} row(s) failed
                                    </Text>
                                    {scheduleUploadResult.errors.slice(0, 8).map((err, idx) => (
                                        <Text key={idx} style={styles.scheduleUploadErrorLine}>{err}</Text>
                                    ))}
                                </View>
                            ) : null}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Manage Nights Modal */}
            <Modal
                visible={showManageNightsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowManageNightsModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowManageNightsModal(false)}>
                    <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Manage Night Offs</Text>
                            <TouchableOpacity onPress={() => setShowManageNightsModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent}>
                            <Text style={styles.modalSubtitle}>
                                {manageNightsStaffName} — toggle night off for dates around {formatDate(selectedDate)}.
                                Day off and night off are scheduled independently.
                            </Text>
                            {loadingNightSchedule ? (
                                <ActivityIndicator style={{ marginVertical: 24 }} color={theme.colors.primary} />
                            ) : (
                                nightOffSchedule.map((entry) => (
                                    <View key={entry.date} style={styles.nightScheduleRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.nightScheduleDate}>
                                                {formatNightOffScheduleLabel(entry.date)}
                                            </Text>
                                            {entry.date === dateString ? (
                                                <Text style={styles.nightScheduleHint}>Selected day</Text>
                                            ) : null}
                                            {entry.is_day_off ? (
                                                <Text style={styles.nightScheduleHint}>Day off</Text>
                                            ) : null}
                                        </View>
                                        <Switch
                                            value={entry.is_night_off}
                                            disabled={savingNightDate === entry.date || !manageNightsStaffId}
                                            onValueChange={(enabled) => {
                                                if (manageNightsStaffId) {
                                                    void handleSetNightOffForDate(manageNightsStaffId, entry.date, enabled);
                                                }
                                            }}
                                        />
                                    </View>
                                ))
                            )}
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
    offStaffCard: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        backgroundColor: theme.colors.surface,
    },
    offStaffCardHeader: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    offStaffName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    offStaffBunk: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    offStaffBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    dayOffBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    dayOffBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1e40af',
    },
    nightOffBadge: {
        backgroundColor: '#ede9fe',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    nightOffBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#5b21b6',
    },
    offStaffActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
    },
    manageNightsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
    },
    manageNightsBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    nightScheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    nightScheduleDate: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    nightScheduleHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    scheduleUploadHelp: {
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    scheduleUploadHelpTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 6,
    },
    scheduleUploadHelpText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    scheduleTemplateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingVertical: 8,
    },
    scheduleTemplateBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    scheduleUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        marginBottom: 12,
    },
    scheduleUploadBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    scheduleUploadErrors: {
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    scheduleUploadErrorsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#991b1b',
        marginBottom: 8,
    },
    scheduleUploadErrorLine: {
        fontSize: 12,
        color: '#991b1b',
        marginBottom: 4,
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
    scannerPanel: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    scannerPanelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    scannerPanelLeft: {
        flex: 1,
        minWidth: 0,
    },
    scannerPanelLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#166534',
        marginBottom: 6,
    },
    scannerInputField: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: '#86efac',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        fontSize: 16,
        color: theme.colors.text,
    },
    scannerSubmitButton: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 20,
        minHeight: 44,
        minWidth: 96,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
    },
    scannerSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        flexDirection: 'column',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    bunkModalGestureRoot: {
        flex: 1,
        minHeight: 0,
        width: '100%',
    },
    bunkModalBody: {
        flex: 1,
        minHeight: 0,
        width: '100%',
    },
    bunkModalScroll: {
        flex: 1,
        minHeight: 0,
    },
    bunkModalScrollContent: {
        paddingHorizontal: 14,
        paddingTop: 8,
        /** Do not use flexGrow — it breaks vertical scrolling inside modals on iOS */
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
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 14,
    },
    bunkFormLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 6,
    },
    bunkFormInput: {
        width: '100%',
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#ffffff',
        fontSize: 16,
        color: theme.colors.text,
    },
    addBunkFieldCompact: {
        width: '100%',
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
        maxHeight: 380,
        minHeight: 200,
    },
    bunksScrollListCompact: {
        maxHeight: 340,
        minHeight: 160,
    },
    bunksHScroll: {
        flexGrow: 0,
    },
    bunkTableSheet: {
        minWidth: 600,
        paddingBottom: 8,
    },
    bunkTableHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: '#f8fafc',
    },
    bunkTableHeadCell: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    bunkColNum: {
        width: 56,
        paddingRight: 4,
    },
    bunkColName: {
        width: 132,
        paddingRight: 4,
    },
    bunkColDiv: {
        width: 124,
        paddingRight: 4,
    },
    bunkColStaff: {
        width: 260,
        paddingRight: 4,
    },
    bunkColDivWrap: {
        justifyContent: 'center',
    },
    bunkColAct: {
        width: 48,
    },
    bunkTableDataRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: '#ffffff',
    },
    bunkTableCell: {
        fontSize: 14,
        color: theme.colors.text,
    },
    bunkTableCellStrong: {
        fontWeight: '600',
    },
    bunkTableCellMuted: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    divisionBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#ccfbf1',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#99f6e4',
        maxWidth: '100%',
    },
    divisionBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0f766e',
    },
    bunkStaffCell: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 6,
    },
    bunkStaffCellWide: {
        width: 260,
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
    },
    assignStaffStack: {
        width: '100%',
        gap: 8,
    },
    assignStaffSelectWide: {
        width: '100%',
        alignSelf: 'stretch',
    },
    assignStaffBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    bunkAssignCardList: {
        marginTop: 4,
        gap: 12,
    },
    bunkAssignCard: {
        width: '100%',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        backgroundColor: '#ffffff',
    },
    bunkAssignCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    bunkAssignCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bunkAssignMetaLine: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 6,
    },
    bunkAssignMetaLabel: {
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    bunkAssignMetaValue: {
        fontWeight: '400',
        color: theme.colors.text,
    },
    bunkAssignDivisionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    bunkAssignSectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 6,
    },
    bunkAssignEditBlock: {
        marginTop: 8,
        gap: 10,
        width: '100%',
    },
    bunkAssignSelectFull: {
        width: '100%',
        alignSelf: 'stretch',
    },
    bunkAssignBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bunkAssignBtnHalf: {
        flex: 1,
        minWidth: 0,
    },
    bunkEmptyRowCompact: {
        paddingVertical: 24,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    bunkActCell: {
        alignItems: 'center',
        paddingTop: 2,
    },
    staffChipOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        maxWidth: '100%',
    },
    staffChipOutlineText: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.text,
        flexShrink: 1,
    },
    assignStaffSelect: {
        flex: 1,
        minWidth: 140,
        maxWidth: 220,
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
        paddingBottom: 12,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
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
    bunkPickerScroll: {
        maxHeight: 360,
    },
    pickerOption: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#edf0f4',
    },
    pickerOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
});

