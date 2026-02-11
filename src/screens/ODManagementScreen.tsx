import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


interface Staff {
    id: string;
    name: string;
    department: string | null;
    role: string;
    rfid: string | null;
}

interface Bunk {
    id: string;
    bunk_number: number;
    bunk_name: string | null;
    division_id: string | null;
}

interface BunkStaff {
    id: string;
    bunk_id: string;
    staff_id: string;
    is_primary: boolean;
    staff?: Staff;
    bunk?: Bunk;
}

interface DayOff {
    id: string;
    staff_id: string;
    date: string;
    is_day_off: boolean;
    is_night_off: boolean;
    is_sleeping_out: boolean;
    checked_out: boolean;
    checked_in: boolean;
    checked_out_at: string | null;
    checked_in_at: string | null;
    notes: string | null;
    staff?: Staff;
}

export const ODManagementScreen = ({ navigation }: any) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'OD' | 'OFF'>('OD');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [showManageBanksModal, setShowManageBanksModal] = useState(false);
    const [showSwapDialog, setShowSwapDialog] = useState(false);
    const [selectedStaffForSwap, setSelectedStaffForSwap] = useState<string | null>(null);
    const [newSwapDate, setNewSwapDate] = useState<Date | null>(null);

    // RFID Scanner state
    const [scannerMode, setScannerMode] = useState(false);
    const [rfidInput, setRfidInput] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const rfidInputRef = useRef<TextInput>(null);

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
    const currentSeason = new Date().getFullYear().toString(); // Default to current year as season
    const dateStr = selectedDate.toISOString().split('T')[0];

    // Fetch staff
    const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
        queryKey: ['staff', companyId, currentSeason],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from("staff")
                .select("id, name, department, role, rfid")
                .eq("company_id", companyId)
                .eq("season", currentSeason)
                .order("name");
            if (error) throw error;
            return data;
        },
        enabled: !!companyId
    });

    // Fetch bunks
    const { data: bunks = [], isLoading: isLoadingBunks } = useQuery({
        queryKey: ['bunks', companyId, currentSeason],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from("bunks")
                .select("id, bunk_number, bunk_name, division_id")
                .eq("company_id", companyId)
                .eq("season", currentSeason)
                .eq("is_active", true)
                .order("bunk_number");
            if (error) throw error;
            return data;
        },
        enabled: !!companyId
    });

    // Fetch bunk_staff
    const { data: bunkStaff = [], isLoading: isLoadingBunkStaff } = useQuery({
        queryKey: ['bunk_staff', companyId, currentSeason],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from("bunk_staff")
                .select(`
                    id, bunk_id, staff_id, is_primary,
                    staff:staff_id(id, name, department, role, rfid),
                    bunk:bunk_id(id, bunk_number, bunk_name, division_id)
                `)
                .eq("company_id", companyId)
                .eq("season", currentSeason);
            if (error) throw error;
            return data as unknown as BunkStaff[];
        },
        enabled: !!companyId
    });

    // Fetch days_off
    const { data: daysOff = [], isLoading: isLoadingDaysOff } = useQuery({
        queryKey: ['staff_days_off', companyId, currentSeason, dateStr],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from("staff_days_off")
                .select(`
                    id, staff_id, date, is_day_off, is_night_off, is_sleeping_out, 
                    checked_out, checked_in, checked_out_at, checked_in_at, notes,
                    staff:staff_id(id, name, department, role, rfid)
                `)
                .eq("company_id", companyId)
                .eq("season", currentSeason)
                .eq("date", dateStr);
            if (error) throw error;
            return data as unknown as DayOff[];
        },
        enabled: !!companyId
    });

    const loading = isLoadingStaff || isLoadingBunks || isLoadingBunkStaff || isLoadingDaysOff;

    const navigateDate = (direction: 'prev' | 'next') => {
        const offset = direction === 'prev' ? -1 : 1;
        const newDate = new Date(selectedDate.getTime() + offset * 24 * 60 * 60 * 1000);
        setSelectedDate(newDate);
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const staffOffIds = daysOff
        .filter(d => d.is_day_off || d.is_night_off)
        .map(d => d.staff_id);

    const uncoveredBunks = bunks.filter(bunk => {
        const assignedStaff = bunkStaff.filter(bs => bs.bunk_id === bunk.id);
        if (assignedStaff.length === 0) return true;
        return assignedStaff.every(bs => staffOffIds.includes(bs.staff_id));
    });

    const getStaffWithBunk = () => {
        return bunkStaff.map(bs => {
            const staffMember = staff.find(s => s.id === bs.staff_id);
            const bunk = bunks.find(b => b.id === bs.bunk_id);
            const dayOff = daysOff.find(d => d.staff_id === bs.staff_id);

            return {
                ...bs,
                staff: staffMember,
                bunk,
                dayOff
            };
        }).filter(item => item.staff && item.bunk)
            .sort((a, b) => (a.bunk?.bunk_number || 0) - (b.bunk?.bunk_number || 0));
    };

    const filteredStaffWithBunk = getStaffWithBunk().filter(item =>
        item.staff?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bunk?.bunk_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Mutations
    const toggleDayOffMutation = useMutation({
        mutationFn: async ({ staffId, field }: { staffId: string, field: 'is_day_off' | 'is_night_off' | 'is_sleeping_out' }) => {
            if (!companyId) return;
            const existing = daysOff.find(d => d.staff_id === staffId);
            if (existing) {
                const newValue = !existing[field];
                const updates: any = { [field]: newValue };
                if (field === 'is_day_off') updates.is_night_off = newValue;
                const { error } = await supabase.from("staff_days_off").update(updates).eq("id", existing.id);
                if (error) throw error;
            } else {
                const newRecord = {
                    company_id: companyId,
                    staff_id: staffId,
                    date: dateStr,
                    season: currentSeason,
                    is_day_off: field === 'is_day_off',
                    is_night_off: field === 'is_day_off' || field === 'is_night_off',
                    is_sleeping_out: field === 'is_sleeping_out'
                };
                const { error } = await supabase.from("staff_days_off").insert(newRecord);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            Alert.alert("Success", "Updated successfully");
        }
    });

    const checkInOutMutation = useMutation({
        mutationFn: async ({ staffId, type }: { staffId: string, type: 'out' | 'in' }) => {
            if (!companyId) return;
            const existing = daysOff.find(d => d.staff_id === staffId);
            if (!existing) throw new Error("Please set day off first");
            if (type === 'out' && !existing.is_day_off) {
                return new Promise((_, reject) => {
                    Alert.alert(
                        "Warning",
                        "This staff member is not scheduled off today. Continue?",
                        [
                            { text: "Cancel", onPress: () => reject(new Error("Cancelled")), style: "cancel" },
                            {
                                text: "Continue", onPress: async () => {
                                    const updates = { checked_out: true, checked_out_at: new Date().toISOString() };
                                    const { error } = await supabase.from("staff_days_off").update(updates).eq("id", existing.id);
                                    if (error) reject(error);
                                    else queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
                                }
                            }
                        ]
                    );
                });
            }
            const updates = type === 'out'
                ? { checked_out: true, checked_out_at: new Date().toISOString() }
                : { checked_in: true, checked_in_at: new Date().toISOString() };
            const { error } = await supabase.from("staff_days_off").update(updates).eq("id", existing.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            Alert.alert("Success", "Updated successfully");
        }
    });

    const swapDayOffMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStaffForSwap || !newSwapDate || !companyId) return;
            const oldDateStr = selectedDate.toISOString().split('T')[0];
            const newDateStr = newSwapDate.toISOString().split('T')[0];

            await supabase.from("staff_days_off").delete().eq("staff_id", selectedStaffForSwap).eq("date", oldDateStr).eq("company_id", companyId);
            const { error } = await supabase.from("staff_days_off").upsert({
                company_id: companyId,
                staff_id: selectedStaffForSwap,
                date: newDateStr,
                season: currentSeason,
                is_day_off: true,
                is_night_off: true
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            setShowSwapDialog(false);
            setSelectedStaffForSwap(null);
            setNewSwapDate(null);
            Alert.alert("Success", "Day off switched successfully");
        }
    });

    const handleRfidScan = async () => {
        const valueToScan = rfidInput.trim();
        if (!valueToScan) return;
        setIsScanning(true);
        try {
            const { data: staffMember, error } = await supabase
                .from('staff')
                .select('id, name, rfid')
                .eq('rfid', valueToScan)
                .eq('company_id', companyId)
                .eq('season', currentSeason)
                .single();

            if (error || !staffMember) {
                Alert.alert("Error", "Wristband not recognized");
                setRfidInput("");
                return;
            }

            const existingDayOff = daysOff.find(d => d.staff_id === staffMember.id);
            if (!existingDayOff || !existingDayOff.is_day_off) {
                Alert.alert("Warning", `${staffMember.name} is NOT scheduled off today.`);
                setRfidInput("");
                return;
            }

            if (!existingDayOff.checked_out) {
                await checkInOutMutation.mutateAsync({ staffId: staffMember.id, type: 'out' });
            } else if (!existingDayOff.checked_in) {
                await checkInOutMutation.mutateAsync({ staffId: staffMember.id, type: 'in' });
            } else {
                Alert.alert("Info", `${staffMember.name} has already checked out and in today.`);
            }
            setRfidInput("");
        } catch (error) {
            console.error("RFID scan error:", error);
            Alert.alert("Error", "Scan error occurred");
        } finally {
            setIsScanning(false);
        }
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
                        style={[styles.actionButton, scannerMode && { backgroundColor: theme.colors.success + '20' }]}
                        onPress={() => setScannerMode(!scannerMode)}
                    >
                        <Ionicons name="barcode-outline" size={18} color={scannerMode ? theme.colors.success : theme.colors.text} />
                        <Text style={[styles.actionButtonText, scannerMode && { color: theme.colors.success }]}>
                            {scannerMode ? 'Scanner Active' : 'Scan Wristband'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('AdminPanel', { screen: 'Bunks' })}
                    >
                        <Ionicons name="business-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>Manage Bunks</Text>
                    </TouchableOpacity>
                </View>

                {/* RFID Scanner Input Overlay */}
                {scannerMode && (
                    <View style={styles.scannerOverlay}>
                        <TextInput
                            ref={rfidInputRef}
                            style={styles.scannerInput}
                            placeholder="Scan wristband or enter RFID..."
                            value={rfidInput}
                            onChangeText={setRfidInput}
                            onSubmitEditing={handleRfidScan}
                            autoFocus
                        />
                        {isScanning && <ActivityIndicator size="small" color={theme.colors.primary} />}
                    </View>
                )}

                {/* Uncovered Bunks Alert */}
                {uncoveredBunks.length > 0 && (
                    <View style={styles.alertBox}>
                        <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.alertTitle}>Uncovered Bunks</Text>
                            <Text style={styles.alertText}>
                                {uncoveredBunks.map(b => b.bunk_name || `Bunk ${b.bunk_number}`).join(", ")}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Date Selector */}
                <View style={styles.dateSelector}>
                    <TouchableOpacity onPress={() => navigateDate('prev')}>
                        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.dateDisplay}>
                        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigateDate('next')}>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'OD' && styles.tabActive]}
                        onPress={() => setActiveTab('OD')}
                    >
                        <Text style={[styles.tabText, activeTab === 'OD' && styles.tabTextActive]}>OD</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'OFF' && styles.tabActive]}
                        onPress={() => setActiveTab('OFF')}
                    >
                        <Text style={[styles.tabText, activeTab === 'OFF' && styles.tabTextActive]}>OFF</Text>
                    </TouchableOpacity>
                </View>

                {/* Staff Table Card */}
                <StyledCard style={styles.staffCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{activeTab === 'OD' ? 'On Duty Staff' : 'Staff Off'}</Text>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or bunk..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {loading ? (
                        <ActivityIndicator style={{ padding: 20 }} color={theme.colors.primary} />
                    ) : (
                        <View style={styles.staffTable}>
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Bunk</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>{activeTab === 'OD' ? 'Out' : 'In'}</Text>
                                {activeTab === 'OD' && <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Sleep</Text>}
                                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>Actions</Text>
                            </View>

                            {filteredStaffWithBunk
                                .filter(item => activeTab === 'OD' ? !item.dayOff?.is_day_off : item.dayOff?.is_day_off)
                                .map((item) => (
                                    <View key={item.id} style={styles.tableRow}>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{item.bunk?.bunk_name || item.bunk?.bunk_number}</Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{item.staff?.name}</Text>

                                        <TouchableOpacity
                                            style={[styles.toggleCell, { flex: 1 }]}
                                            onPress={() => checkInOutMutation.mutate({
                                                staffId: item.staff_id,
                                                type: activeTab === 'OD' ? 'out' : 'in'
                                            })}
                                        >
                                            <Ionicons
                                                name={(activeTab === 'OD' ? item.dayOff?.checked_out : item.dayOff?.checked_in) ? "checkbox" : "square-outline"}
                                                size={20}
                                                color={theme.colors.primary}
                                            />
                                        </TouchableOpacity>

                                        {activeTab === 'OD' && (
                                            <TouchableOpacity
                                                style={[styles.toggleCell, { flex: 1 }]}
                                                onPress={() => toggleDayOffMutation.mutate({ staffId: item.staff_id, field: 'is_sleeping_out' })}
                                            >
                                                <Ionicons
                                                    name={item.dayOff?.is_sleeping_out ? "checkbox" : "square-outline"}
                                                    size={20}
                                                    color={theme.colors.primary}
                                                />
                                            </TouchableOpacity>
                                        )}

                                        <View style={[styles.actionsCell, { flex: 1.5 }]}>
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => activeTab === 'OD'
                                                    ? toggleDayOffMutation.mutate({ staffId: item.staff_id, field: 'is_day_off' })
                                                    : (setSelectedStaffForSwap(item.staff_id), setShowSwapDialog(true))
                                                }
                                            >
                                                <Text style={styles.actionBtnText}>{activeTab === 'OD' ? 'Mark Off' : 'Swap'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}

                            {filteredStaffWithBunk.filter(item => activeTab === 'OD' ? !item.dayOff?.is_day_off : item.dayOff?.is_day_off).length === 0 && (
                                <Text style={styles.emptyText}>No staff found</Text>
                            )}
                        </View>
                    )}
                </StyledCard>
            </ScrollView>

            {/* Swap Modal */}
            <Modal visible={showSwapDialog} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Swap Day Off</Text>
                        <Text style={styles.modalText}>Choose a date to move this day off to:</Text>

                        <View style={styles.datePickerContainer}>
                            <TouchableOpacity
                                style={styles.datePickerBtn}
                                onPress={() => {
                                    const nextDate = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
                                    setNewSwapDate(nextDate);
                                }}
                            >
                                <Text>{newSwapDate ? newSwapDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Select Date"}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSwapDialog(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, !newSwapDate && { opacity: 0.5 }]}
                                onPress={() => swapDayOffMutation.mutate()}
                                disabled={!newSwapDate}
                            >
                                <Text style={styles.confirmBtnText}>Confirm Swap</Text>
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
    scannerOverlay: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.success,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    scannerInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: theme.colors.text
    },
    alertBox: {
        backgroundColor: theme.colors.danger + '10',
        borderWidth: 1,
        borderColor: theme.colors.danger,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md
    },
    alertTitle: {
        fontWeight: '700',
        color: theme.colors.danger,
        fontSize: 14
    },
    alertText: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 2
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
    tabText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    tabTextActive: {
        color: 'white',
    },
    staffCard: {
        marginBottom: theme.spacing.md,
    },
    cardHeader: {
        marginBottom: theme.spacing.md,
    },
    cardTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
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
    staffTable: {
        width: '100%'
    },
    tableHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: 10
    },
    tableHeaderCell: {
        fontWeight: '700',
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase'
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    tableCell: {
        fontSize: 14,
        color: theme.colors.text
    },
    toggleCell: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionsCell: {
        alignItems: 'center'
    },
    actionBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    actionBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600'
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: theme.colors.textSecondary
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10
    },
    modalText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 15
    },
    datePickerContainer: {
        marginBottom: 20
    },
    datePickerBtn: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10
    },
    cancelBtn: {
        padding: 10
    },
    cancelBtnText: {
        color: theme.colors.textSecondary,
        fontWeight: '600'
    },
    confirmBtn: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8
    },
    confirmBtnText: {
        color: 'white',
        fontWeight: '600'
    }
});

