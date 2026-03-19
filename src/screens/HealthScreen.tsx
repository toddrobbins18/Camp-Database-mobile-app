import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useCampers, useDivisions } from '../api/campers';
import { useMedicationLogs, useAddMedicationLog, useAdministerMedication, useDeleteMedicationLog, useHealthCenterAdmissions, useAddHealthCenterAdmission, useCheckoutHealthCenterAdmission } from '../api/health';
import { supabase } from '../lib/supabase';

const getChildDisplayName = (child: any) =>
    (child?.name != null && child.name !== '')
        ? String(child.name)
        : [child?.first_name, child?.last_name].filter(Boolean).join(' ').trim() || 'Unknown';

export const HealthScreen = ({ navigation }: any) => {
    const { companyId, season } = useCompany();
    const { data: campersData, isLoading: campersLoading, isError: campersError } = useCampers(companyId, season);
    const { data: divisionsData, isError: divisionsError } = useDivisions(companyId);
    const safeCampers = Array.isArray(campersData) ? campersData : [];
    const safeDivisions = Array.isArray(divisionsData) ? divisionsData : [];

    const [activeView, setActiveView] = useState('list'); // 'list' or 'calendar'
    const [activeTab, setActiveTab] = useState('Daily Log');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [showDivisionPicker, setShowDivisionPicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // January 2026
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 22)); // January 22, 2026
    const [rfidInput, setRfidInput] = useState('');
    const [healthCenterRfidInput, setHealthCenterRfidInput] = useState('');
    const [searchChildrenQuery, setSearchChildrenQuery] = useState('');
    const [selectedChild, setSelectedChild] = useState<string | null>(null);
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [admitReason, setAdmitReason] = useState('');
    const [childToAdmit, setChildToAdmit] = useState<{ id: string; name: string } | null>(null);
    const [selectedMedicationChild, setSelectedMedicationChild] = useState<string>('');
    const [medicationName, setMedicationName] = useState('');
    const [dosage, setDosage] = useState('');
    const [mealTime, setMealTime] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [showChildPicker, setShowChildPicker] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [expandedHistoryChildId, setExpandedHistoryChildId] = useState<string | null>(null);

    const todayDateString = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);
    const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const medicationQueryDate = activeView === 'list' ? todayDateString : dateString;

    // Medications (list view = today; calendar view = selected date)
    const { data: medicationsData } = useMedicationLogs(companyId, medicationQueryDate);
    const addMedicationMutation = useAddMedicationLog();
    const administerMutation = useAdministerMedication();
    const deleteMedicationMutation = useDeleteMedicationLog();
    const safeMedications = Array.isArray(medicationsData) ? medicationsData : [];

    // Admissions
    const admissionsQuery = useHealthCenterAdmissions(companyId);
    const admissionsData = admissionsQuery.data;
    const safeAdmissions = Array.isArray(admissionsData) ? admissionsData : [];
    const addAdmissionMutation = useAddHealthCenterAdmission();
    const checkoutMutation = useCheckoutHealthCenterAdmission();

    const currentlyAdmitted = useMemo(() => safeAdmissions.filter((a: any) => !a.checked_out_at), [safeAdmissions]);
    const admissionHistory = useMemo(() => safeAdmissions.filter((a: any) => a.checked_out_at), [safeAdmissions]);
    const groupedHistory = useMemo(() => {
        const acc: Record<string, { child: any; admissions: any[] }> = {};
        admissionHistory.forEach((a: any) => {
            const key = a.child_id || a.id;
            if (!acc[key]) acc[key] = { child: a.children, admissions: [] };
            acc[key].admissions.push(a);
        });
        return acc;
    }, [admissionHistory]);

    // Filter children based on search query
    const filteredChildren = useMemo(() => {
        return safeCampers.filter((child: any) => {
            const displayName = getChildDisplayName(child);
            const divisionName = child.division?.name || child.group_name || '';
            const matchesSearch = displayName.toLowerCase().includes(searchChildrenQuery.toLowerCase()) ||
                divisionName.toLowerCase().includes(searchChildrenQuery.toLowerCase());
            const matchesDivision = selectedDivision === 'All Divisions' || child.division_id === selectedDivision;
            return matchesSearch && matchesDivision;
        }).map((child: any) => ({
            id: child.id,
            name: getChildDisplayName(child),
            division: child.division?.name || child.group_name || 'N/A'
        }));
    }, [safeCampers, searchChildrenQuery, selectedDivision]);
    

    const handleAdmitChild = async () => {
        if (!childToAdmit || !companyId) {
            Alert.alert('Cannot admit child', 'Missing child or company information.');
            return;
        }

        try {
            // Prevent duplicate active health-center stays (matches web flow)
            const { data: existing } = await supabase
                .from('health_center_admissions')
                .select('id')
                .eq('child_id', childToAdmit.id)
                .eq('company_id', companyId)
                .is('checked_out_at', null)
                .maybeSingle();

            if (existing) {
                Alert.alert('Child already admitted', `${childToAdmit.name} is already in the health center.`);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            await addAdmissionMutation.mutateAsync({
                company_id: companyId,
                child_id: childToAdmit.id,
                reason: admitReason.trim() || null,
                notes: null,
                season,
                admitted_by: user?.id ?? undefined,
            } as any);

            // Ensure the lists update immediately (Currently Admitted + History)
            await admissionsQuery.refetch();

            setShowAdmitModal(false);
            setAdmitReason('');
            setChildToAdmit(null);
            // Avoid modal teardown race in RN web by alerting after close.
            setTimeout(() => {
                Alert.alert('Child admitted', `${childToAdmit.name} has been admitted to the health center.`);
            }, 0);
        } catch (error: any) {
            const message = error?.message || 'Could not admit child to health center.';
            Alert.alert('Admit failed', message);
        }
    };

    const getAdmissionDuration = (admittedAt: string, checkedOutAt?: string | null) => {
        const start = new Date(admittedAt);
        const end = checkedOutAt ? new Date(checkedOutAt) : new Date();
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
        return `${diffMins}m`;
    };

    const handleCheckoutChild = async (admissionId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await checkoutMutation.mutateAsync({ id: admissionId, checkedOutBy: user?.id });

            // Ensure the admission moves from "Currently Admitted" to "Health Center Log"
            await admissionsQuery.refetch();
        } catch (error: any) {
            const message = error?.message || 'Could not check out child from the health center.';
            Alert.alert('Checkout failed', message);
        }
    };

    const handleAddMedication = () => {
        if (!selectedMedicationChild || !medicationName || !companyId) return;

        const child = safeCampers.find((c: any) => getChildDisplayName(c) === selectedMedicationChild);
        if (!child) return;

        let time = '08:00';
        if (mealTime === 'Before Breakfast') time = '08:00';
        if (mealTime === 'After Breakfast') time = '09:00';
        if (mealTime === 'Before Lunch') time = '12:00';
        if (mealTime === 'After Lunch') time = '13:00';
        if (mealTime === 'Before Dinner') time = '18:00';
        if (mealTime === 'After Dinner') time = '19:00';
        if (mealTime === 'Bedtime') time = '21:00';

        addMedicationMutation.mutate({
            company_id: companyId,
            child_id: child.id as string,
            medication_name: medicationName,
            dosage: dosage || null,
            scheduled_time: time,
            date: todayDateString,
            notes: notes || null,
            alert_sent: false
        }, {
            onSuccess: () => {
                setMedicationName('');
                setDosage('');
                setNotes('');
                setMealTime('');
                setSelectedMedicationChild('');
            }
        });
    };

    const handleMarkAdministered = (medId: string) => {
        administerMutation.mutate({ id: medId, companyId });
    };

    const handleDeleteMedication = (medId: string) => {
        Alert.alert('Delete medication', 'Remove this medication log?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMedicationMutation.mutate(medId) }
        ]);
    };

    // Calendar functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Previous month days
        const prevMonth = new Date(year, month - 1, 0);
        const prevMonthDays = prevMonth.getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevMonthDays - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevMonthDays - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: i,
                isCurrentMonth: true,
                fullDate: new Date(year, month, i)
            });
        }

        // Next month days to fill the grid
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const formatMonthYear = (date: Date) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const isSameDate = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return isSameDate(date, today);
    };

    const isPastDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    };

    const formatSelectedDate = (date: Date) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const calendarDays = getDaysInMonth(currentDate);
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const handleUploadCSV = () => {
        setShowUploadModal(true);
    };

    const tabs = ['Daily Log', "Today's Medications", 'Health Center', 'Health Center Log', 'Add Medication'];

    // Build a list of division option ids for the picker
    const divisions = ['All Divisions', ...safeDivisions.map((division: any) => division.id)];

    const hasError = campersError || divisionsError;
    const isLoadingCompany = !companyId || campersLoading;

    if (isLoadingCompany) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (hasError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Ionicons name="warning-outline" size={48} color={theme.colors.danger} />
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorMessage}>Unable to load nurse data. Try again later.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Nurse Dashboard</Text>
                        <Text style={styles.subtitle}>Manage children's daily medications</Text>
                    </View>
                </View>

                {/* View Controls */}
                <View style={styles.viewControls}>
                    <TouchableOpacity
                        style={[styles.viewControlBtn, activeView === 'list' && styles.viewControlBtnActive]}
                        onPress={() => setActiveView('list')}
                    >
                        <Ionicons
                            name="list-outline"
                            size={18}
                            color={activeView === 'list' ? 'white' : theme.colors.text}
                        />
                        <Text style={[styles.viewControlText, activeView === 'list' && styles.viewControlTextActive]}>
                            List
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.viewControlBtn, activeView === 'calendar' && styles.viewControlBtnActive]}
                        onPress={() => setActiveView('calendar')}
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={activeView === 'calendar' ? 'white' : theme.colors.text}
                        />
                        <Text style={[styles.viewControlText, activeView === 'calendar' && styles.viewControlTextActive]}>
                            Calendar
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.viewControlIcon}>
                        <Ionicons name="time-outline" size={18} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadCSV}>
                        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.uploadBtnText}>Upload CSV</Text>
                    </TouchableOpacity>
                </View>

                {/* Search and Filter Section */}
                <View style={styles.searchFilterSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by child name..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        onPress={() => setShowDivisionPicker(true)}
                    >
                        <Text style={styles.dropdownText}>{selectedDivision === 'All Divisions' ? 'All Divisions' : safeDivisions.find((d: any) => d.id === selectedDivision)?.name || 'Select Division'}</Text>
                        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.sortBtn}>
                    <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.text} />
                    <Text style={styles.sortBtnText}>Sort by Division</Text>
                </TouchableOpacity>

                {/* Conditional Content: Calendar or List View */}
                {activeView === 'calendar' ? (
                    <>
                        {/* Calendar Component */}
                        <StyledCard style={styles.calendarCard}>
                            {/* Calendar Header */}
                            <View style={styles.calendarHeader}>
                                <TouchableOpacity onPress={() => navigateMonth('prev')}>
                                    <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                                </TouchableOpacity>
                                <Text style={styles.calendarMonthYear}>{formatMonthYear(currentDate)}</Text>
                                <TouchableOpacity onPress={() => navigateMonth('next')}>
                                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Week Days Header */}
                            <View style={styles.weekDaysContainer}>
                                {weekDays.map((day) => (
                                    <View key={day} style={styles.weekDay}>
                                        <Text style={styles.weekDayText}>{day}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Calendar Grid */}
                            <View style={styles.calendarGrid}>
                                {calendarDays.map((day, index) => {
                                    const isSelected = isSameDate(day.fullDate, selectedDate);
                                    const isTodayDate = isToday(day.fullDate);
                                    const isPast = isPastDate(day.fullDate);

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.calendarDay,
                                                !day.isCurrentMonth && styles.calendarDayOtherMonth,
                                                isSelected && styles.calendarDaySelected,
                                                isTodayDate && !isSelected && styles.calendarDayToday,
                                            ]}
                                            onPress={() => setSelectedDate(day.fullDate)}
                                        >
                                            <Text
                                                style={[
                                                    styles.calendarDayText,
                                                    !day.isCurrentMonth && styles.calendarDayTextOtherMonth,
                                                    isSelected && styles.calendarDayTextSelected,
                                                    isTodayDate && !isSelected && styles.calendarDayTextToday,
                                                ]}
                                            >
                                                {day.date}
                                            </Text>
                                            {index === 27 && day.isCurrentMonth && (
                                                <View style={styles.calendarDayDot} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </StyledCard>

                        {/* Medications for Selected Date */}
                        <StyledCard style={styles.medicationDateCard}>
                            <Text style={styles.medicationDateTitle}>
                                Medications for {formatSelectedDate(selectedDate)}
                            </Text>
                            {isPastDate(selectedDate) && (
                                <Text style={styles.pastDateText}>Past date - View only with notes option</Text>
                            )}
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No medications scheduled for this date</Text>
                            </View>
                        </StyledCard>
                    </>
                ) : (
                    <>
                        {/* Tabs */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.tabsContainer}
                            contentContainerStyle={styles.tabsContent}
                        >
                            {tabs.map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Conditional Content Based on Active Tab */}
                        {activeTab === "Today's Medications" ? (
                            <StyledCard style={styles.todaysMedicationsCard}>
                                <Text style={styles.todaysMedicationsTitle}>Today's Medications</Text>
                                <Text style={styles.todaysMedicationsSubtitle}>Track medication administration</Text>

                                {/* RFID Quick Check-In Card */}
                                <StyledCard style={styles.rfidCard}>
                                    <View style={styles.rfidHeader}>
                                        <Ionicons name="radio-outline" size={24} color={theme.colors.text} />
                                        <Text style={styles.rfidTitle}>RFID Quick Check-In</Text>
                                    </View>
                                    <Text style={styles.rfidDescription}>
                                        Scan camper's RFID bracelet to automatically administer their medications.
                                    </Text>

                                    <View style={styles.rfidInputContainer}>
                                        <TextInput
                                            style={styles.rfidInput}
                                            placeholder="Scan or type RFID..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={rfidInput}
                                            onChangeText={setRfidInput}
                                        />
                                        <TouchableOpacity style={styles.scanButton}>
                                            <Ionicons name="scan-outline" size={18} color="white" />
                                            <Text style={styles.scanButtonText}>Scan</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.clearButton}
                                            onPress={() => setRfidInput('')}
                                        >
                                            <Text style={styles.clearButtonText}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                </StyledCard>

                                {/* Empty State or List - card per medication with Pending/Given, Mark as Administered, Edit, Delete */}
                                {safeMedications.length === 0 ? (
                                    <View style={styles.emptyStateRow}>
                                        <Text style={styles.emptyText}>No medications scheduled for today</Text>
                                        <View style={styles.emptyDot} />
                                    </View>
                                ) : (
                                    safeMedications.map((med: any) => (
                                        <View key={med.id} style={styles.medicationCard}>
                                            <View style={styles.medicationCardHeader}>
                                                <Text style={styles.medicationCardName}>{med.children?.name}</Text>
                                                <View style={styles.medicationCardBadges}>
                                                    {med.administered ? (
                                                        <View style={[styles.statusBadge, styles.statusBadgeGiven]}>
                                                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                                            <Text style={styles.statusBadgeGivenText}>Given</Text>
                                                        </View>
                                                    ) : (
                                                        <View style={[styles.statusBadge, styles.statusBadgePending]}>
                                                            <Ionicons name="warning" size={14} color={theme.colors.warning || '#f59e0b'} />
                                                            <Text style={styles.statusBadgePendingText}>Pending</Text>
                                                        </View>
                                                    )}
                                                    <TouchableOpacity onPress={() => handleDeleteMedication(med.id)} style={styles.medicationCardIconBtn}>
                                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger || '#ef4444'} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <Text style={styles.medicationCardDetail}>{med.medication_name}{med.dosage ? ` - ${med.dosage}` : ''}</Text>
                                            <Text style={styles.medicationCardTime}>
                                                {med.scheduled_time === '08:00' ? 'Before Breakfast' : med.scheduled_time === '12:00' ? 'Before Lunch' : med.scheduled_time === '18:00' ? 'Before Dinner' : med.scheduled_time === '21:00' ? 'Bedtime' : med.scheduled_time}
                                            </Text>
                                            {med.date ? (
                                                <View style={styles.medicationCardDateRow}>
                                                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                                                    <Text style={styles.medicationCardDate}>Started: {new Date(med.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                                                </View>
                                            ) : null}
                                            {!med.administered && (
                                                <TouchableOpacity
                                                    style={styles.markAdministeredButton}
                                                    onPress={() => med.id && handleMarkAdministered(med.id)}
                                                >
                                                    <Text style={styles.markAdministeredButtonText}>Mark as Administered</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))
                                )}
                            </StyledCard>
                        ) : activeTab === 'Health Center' ? (
                            <View style={styles.healthCenterContainer}>
                                {/* Health Center Admissions Header */}
                                <View style={styles.healthCenterHeader}>
                                    <View style={styles.healthCenterTitleRow}>
                                        <Ionicons name="lock-closed-outline" size={20} color={theme.colors.secondary} />
                                        <Text style={styles.healthCenterTitle}>Health Center Admissions</Text>
                                    </View>
                                    <Text style={styles.healthCenterSubtitle}>
                                        Track overnight admissions to the health center
                                    </Text>
                                </View>

                                {/* Currently Admitted Section */}
                                {currentlyAdmitted.length > 0 && (
                                    <View style={styles.currentlyAdmittedSection}>
                                        <View style={styles.currentlyAdmittedHeader}>
                                            <Ionicons name="warning" size={20} color={theme.colors.danger} />
                                            <Text style={styles.currentlyAdmittedTitle}>Currently Admitted ({currentlyAdmitted.length})</Text>
                                        </View>
                                        {currentlyAdmitted.map((admission: any) => {
                                            const name = admission.children?.name || 'Unknown';
                                            const groupName = admission.children?.group_name || '';
                                            return (
                                                <View key={admission.id} style={styles.admittedCard}>
                                                    <View style={styles.admittedCardContent}>
                                                        <View style={styles.admittedCardRow}>
                                                            <Text style={styles.admittedCardName}>{name}</Text>
                                                            <View style={styles.camperBadge}><Text style={styles.camperBadgeText}>Camper</Text></View>
                                                        </View>
                                                        <View style={styles.admittedCardTimeRow}>
                                                            <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                                                            <Text style={styles.admittedCardTime}>
                                                                Admitted {admission.admitted_at ? new Date(admission.admitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                                            </Text>
                                                            <View style={styles.durationBadge}>
                                                                <Text style={styles.durationBadgeText}>{getAdmissionDuration(admission.admitted_at)}</Text>
                                                            </View>
                                                        </View>
                                                        {admission.reason ? (
                                                            <Text style={styles.admittedReason}><Text style={styles.admittedReasonLabel}>Reason: </Text>{admission.reason}</Text>
                                                        ) : (
                                                            <Text style={styles.admittedReason}><Text style={styles.admittedReasonLabel}>Reason: </Text>unknown</Text>
                                                        )}
                                                        {admission.notes ? <Text style={styles.admittedNotes}>{admission.notes}</Text> : null}
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.checkOutButton}
                                                        onPress={() => admission.id && handleCheckoutChild(admission.id)}
                                                    >
                                                        <Ionicons name="person-remove-outline" size={16} color="white" />
                                                        <Text style={styles.checkOutButtonText}>Check Out</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* RFID Quick Check-in / Check-Out Card */}
                                <StyledCard style={styles.rfidCard}>
                                    <View style={styles.rfidHeader}>
                                        <Ionicons name="radio-outline" size={24} color={theme.colors.secondary} />
                                        <Text style={styles.rfidTitle}>RFID Quick Check-in / Check-Out</Text>
                                    </View>
                                    <Text style={styles.rfidDescription}>
                                        Scan RFID to admit or check out - system auto-detects the action
                                    </Text>

                                    <View style={styles.rfidInputContainer}>
                                        <TextInput
                                            style={styles.rfidInput}
                                            placeholder="Scan or type RFID..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={healthCenterRfidInput}
                                            onChangeText={setHealthCenterRfidInput}
                                        />
                                        <TouchableOpacity style={styles.scanButton}>
                                            <Ionicons name="scan-outline" size={18} color="white" />
                                            <Text style={styles.scanButtonText}>Scan</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.clearButton}
                                            onPress={() => setHealthCenterRfidInput('')}
                                        >
                                            <Text style={styles.clearButtonText}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                </StyledCard>

                                {/* Search Children Section */}
                                <View style={styles.searchChildrenSection}>
                                    <Text style={styles.searchChildrenTitle}>Search Children</Text>
                                    <View style={styles.searchChildrenInputContainer}>
                                        <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                                        <TextInput
                                            style={styles.searchChildrenInput}
                                            placeholder="Search by name..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={searchChildrenQuery}
                                            onChangeText={setSearchChildrenQuery}
                                        />
                                    </View>
                                </View>

                                {/* Available Children Section (exclude already admitted) */}
                                <View style={styles.availableChildrenSection}>
                                    <View style={styles.availableChildrenHeader}>
                                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                        <Text style={styles.availableChildrenTitle}>Available Children</Text>
                                    </View>

                                    <ScrollView
                                        style={styles.childrenList}
                                        showsVerticalScrollIndicator={true}
                                    >
                                        {filteredChildren
                                            .filter((child: any) => !currentlyAdmitted.some((a: any) => a.child_id === child.id))
                                            .map((child) => {
                                            const isSelected = selectedChild === child.id;
                                            return (
                                                <TouchableOpacity
                                                    key={child.id}
                                                    style={[
                                                        styles.childCard,
                                                        isSelected && styles.childCardSelected
                                                    ]}
                                                    onPress={() => setSelectedChild(isSelected ? null : child.id)}
                                                >
                                                    <View style={styles.childCardContent}>
                                                        <Text style={[
                                                            styles.childName,
                                                            isSelected && styles.childNameSelected
                                                        ]}>
                                                            {child.name}
                                                        </Text>
                                                        <View style={styles.childDivisionTag}>
                                                            <Text style={[
                                                                styles.childDivisionText,
                                                                isSelected && styles.childDivisionTextSelected
                                                            ]}>
                                                                {child.division}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.admitButton,
                                                            isSelected && styles.admitButtonSelected
                                                        ]}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setChildToAdmit({ id: child.id, name: child.name });
                                                            setShowAdmitModal(true);
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name="person-add-outline"
                                                            size={16}
                                                            color={isSelected ? 'white' : theme.colors.text}
                                                        />
                                                        <Text style={[
                                                            styles.admitButtonText,
                                                            isSelected && styles.admitButtonTextSelected
                                                        ]}>
                                                            Admit
                                                        </Text>
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>
                        ) : activeTab === 'Health Center Log' ? (
                            <StyledCard style={styles.healthCenterLogCard}>
                                <View style={styles.healthCenterLogHeader}>
                                    <Ionicons name="bar-chart-outline" size={24} color={theme.colors.text} />
                                    <Text style={styles.healthCenterLogTitle}>Health Center Admission History</Text>
                                </View>
                                <Text style={styles.healthCenterLogSubtitle}>
                                    Past health center admissions this season
                                </Text>
                                {Object.keys(groupedHistory).length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No admission history found for this season</Text>
                                    </View>
                                ) : (
                                    <ScrollView style={{ marginTop: 16 }} nestedScrollEnabled>
                                        {Object.entries(groupedHistory).map(([childId, group]: [string, any]) => {
                                            const entity = group.child;
                                            const entityAdmissions = group.admissions;
                                            const isExpanded = expandedHistoryChildId === (entity?.id || childId);
                                            return (
                                                <View key={childId} style={styles.historyGroupCard}>
                                                    <TouchableOpacity
                                                        style={styles.historyGroupHeader}
                                                        onPress={() => setExpandedHistoryChildId(isExpanded ? null : (entity?.id || childId))}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.historyGroupHeaderLeft}>
                                                            <Text style={styles.historyGroupName}>{entity?.name || 'Unknown'}</Text>
                                                            <View style={styles.camperBadge}><Text style={styles.camperBadgeText}>Camper</Text></View>
                                                        </View>
                                                        <Text style={styles.historyGroupDivision}>{entity?.group_name || '—'}</Text>
                                                        <View style={styles.historyGroupMeta}>
                                                            <View style={styles.admissionCountBadge}>
                                                                <Text style={styles.admissionCountText}>{entityAdmissions.length} {entityAdmissions.length === 1 ? 'admission' : 'admissions'}</Text>
                                                            </View>
                                                            <Text style={styles.historyLastDate}>
                                                                Last: {entityAdmissions[0]?.admitted_at ? new Date(entityAdmissions[0].admitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                                            </Text>
                                                        </View>
                                                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
                                                    </TouchableOpacity>
                                                    {isExpanded && (
                                                        <View style={styles.historyGroupDetails}>
                                                            {entityAdmissions.map((admission: any, index: number) => (
                                                                <View key={admission.id} style={styles.historyDetailBlock}>
                                                                    <Text style={styles.historyDetailTitle}>Admission #{entityAdmissions.length - index}</Text>
                                                                    <Text style={styles.historyDetailTime}>
                                                                        {admission.admitted_at ? new Date(admission.admitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''} • {admission.admitted_at ? new Date(admission.admitted_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''} - {admission.checked_out_at ? new Date(admission.checked_out_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                                                                    </Text>
                                                                    <View style={styles.durationBadge}>
                                                                        <Text style={styles.durationBadgeText}>{getAdmissionDuration(admission.admitted_at, admission.checked_out_at)}</Text>
                                                                    </View>
                                                                    {admission.reason ? <Text style={styles.historyDetailReason}><Text style={styles.admittedReasonLabel}>Reason: </Text>{admission.reason}</Text> : null}
                                                                    {admission.notes ? <Text style={styles.historyDetailNotes}><Text style={styles.admittedReasonLabel}>Notes: </Text>{admission.notes}</Text> : null}
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </StyledCard>
                        ) : activeTab === 'Add Medication' ? (
                            <StyledCard style={styles.addMedicationCard}>
                                <View style={styles.addMedicationHeader}>
                                    <Ionicons name="link-outline" size={24} color={theme.colors.text} />
                                    <Text style={styles.addMedicationTitle}>Add Medication</Text>
                                </View>
                                <Text style={styles.addMedicationSubtitle}>
                                    Schedule medication for a child
                                </Text>

                                {/* Form Fields */}
                                <View style={styles.formContainer}>
                                    {/* Child Selection */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Child</Text>
                                        <TouchableOpacity
                                            style={styles.childPickerButton}
                                            onPress={() => setShowChildPicker(true)}
                                        >
                                            <Text style={[
                                                styles.childPickerText,
                                                !selectedMedicationChild && styles.childPickerPlaceholder
                                            ]}>
                                                {selectedMedicationChild || 'Select a child'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Medication Name */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Medication Name</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Enter medication name"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={medicationName}
                                            onChangeText={setMedicationName}
                                        />
                                    </View>

                                    {/* Dosage */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Dosage</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="e.g., 5ml, 1 tablet"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={dosage}
                                            onChangeText={setDosage}
                                        />
                                    </View>

                                    {/* Meal Time */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Meal Time</Text>
                                        <View style={styles.mealTimeContainer}>
                                            <View style={styles.mealTimeColumn}>
                                                <TouchableOpacity
                                                    style={styles.radioButton}
                                                    onPress={() => setMealTime('Before Breakfast')}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        mealTime === 'Before Breakfast' && styles.radioCircleSelected
                                                    ]}>
                                                        {mealTime === 'Before Breakfast' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={styles.radioLabel}>Before Breakfast</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.radioButton}
                                                    onPress={() => setMealTime('Before Lunch')}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        mealTime === 'Before Lunch' && styles.radioCircleSelected
                                                    ]}>
                                                        {mealTime === 'Before Lunch' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={styles.radioLabel}>Before Lunch</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.radioButton}
                                                    onPress={() => setMealTime('Before Dinner')}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        mealTime === 'Before Dinner' && styles.radioCircleSelected
                                                    ]}>
                                                        {mealTime === 'Before Dinner' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={styles.radioLabel}>Before Dinner</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.radioButton}
                                                    onPress={() => setMealTime('Bedtime')}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        mealTime === 'Bedtime' && styles.radioCircleSelected
                                                    ]}>
                                                        {mealTime === 'Bedtime' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={styles.radioLabel}>Bedtime</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.mealTimeColumn}>
                                                <TouchableOpacity
                                                    style={styles.radioButton}
                                                    onPress={() => setMealTime('After Breakfast')}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        mealTime === 'After Breakfast' && styles.radioCircleSelected
                                                    ]}>
                                                        {mealTime === 'After Breakfast' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={styles.radioLabel}>After Breakfast</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.radioButton}
                                                    onPress={() => setMealTime('After Lunch')}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        mealTime === 'After Lunch' && styles.radioCircleSelected
                                                    ]}>
                                                        {mealTime === 'After Lunch' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={styles.radioLabel}>After Lunch</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.radioButton}
                                                    onPress={() => setMealTime('After Dinner')}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        mealTime === 'After Dinner' && styles.radioCircleSelected
                                                    ]}>
                                                        {mealTime === 'After Dinner' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={styles.radioLabel}>After Dinner</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Notes */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Notes</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Additional notes..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={notes}
                                            onChangeText={setNotes}
                                            multiline={true}
                                            numberOfLines={4}
                                        />
                                    </View>

                                    {/* Recurring Medication Checkbox */}
                                    <TouchableOpacity
                                        style={styles.checkboxContainer}
                                        onPress={() => setIsRecurring(!isRecurring)}
                                    >
                                        <View style={[
                                            styles.checkbox,
                                            isRecurring && styles.checkboxSelected
                                        ]}>
                                            {isRecurring && <Ionicons name="checkmark" size={16} color="white" />}
                                        </View>
                                        <Text style={styles.checkboxLabel}>Recurring medication</Text>
                                    </TouchableOpacity>

                                    {/* Add Medication Button */}
                                    <TouchableOpacity
                                        style={styles.addMedicationButton}
                                        onPress={handleAddMedication}
                                    >
                                        <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                                    </TouchableOpacity>
                                </View>
                            </StyledCard>
                        ) : (
                            <StyledCard style={styles.medicationLogCard}>
                                <Text style={styles.logTitle}>Daily Medication Log</Text>
                                <Text style={styles.logDescription}>Mark off medications administered today.</Text>
                                {safeMedications.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No medications scheduled for today.</Text>
                                    </View>
                                ) : (
                                    <View style={{ marginTop: 12 }}>
                                        {(() => {
                                            const byChild: Record<string, any[]> = {};
                                            safeMedications.forEach((med: any) => {
                                                const key = med.child_id;
                                                if (!byChild[key]) byChild[key] = [];
                                                byChild[key].push(med);
                                            });
                                            return Object.entries(byChild).map(([cid, meds]) => {
                                                const name = meds[0]?.children?.name || 'Unknown';
                                                const groupName = meds[0]?.children?.group_name || '';
                                                return (
                                                    <View key={cid} style={styles.dailyLogChildCard}>
                                                        <View style={styles.dailyLogChildHeader}>
                                                            <Text style={styles.dailyLogChildName}>{name}</Text>
                                                            <View style={styles.divisionTagSmall}><Text style={styles.divisionTagSmallText}>{groupName}</Text></View>
                                                        </View>
                                                        {meds.map((med: any) => (
                                                            <View key={med.id} style={styles.dailyLogMedRow}>
                                                                <Text style={styles.dailyLogMedDetail}>{med.medication_name}{med.dosage ? ` - ${med.dosage}` : ''}</Text>
                                                                <Text style={styles.dailyLogMedTime}>
                                                                    {med.scheduled_time === '08:00' ? 'Before Breakfast' : med.scheduled_time === '12:00' ? 'Before Lunch' : med.scheduled_time === '18:00' ? 'Before Dinner' : med.scheduled_time === '21:00' ? 'Bedtime' : med.scheduled_time}
                                                                </Text>
                                                                {med.administered ? (
                                                                    <View style={[styles.statusBadge, styles.statusBadgeGiven, { alignSelf: 'flex-start', marginTop: 4 }]}>
                                                                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                                                        <Text style={styles.statusBadgeGivenText}>Given</Text>
                                                                    </View>
                                                                ) : (
                                                                    <TouchableOpacity
                                                                        style={[styles.markAdministeredButton, { marginTop: 6 }]}
                                                                        onPress={() => med.id && handleMarkAdministered(med.id)}
                                                                    >
                                                                        <Text style={styles.markAdministeredButtonText}>Mark as Administered</Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        ))}
                                                    </View>
                                                );
                                            });
                                        })()}
                                    </View>
                                )}
                            </StyledCard>
                        )}
                    </>
                )}

            </ScrollView>

            {/* Division Picker Modal */}
            <Modal
                visible={showDivisionPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDivisionPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowDivisionPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={styles.pickerContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {divisions.map((division) => (
                                <TouchableOpacity
                                    key={division}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedDivision(division);
                                        setShowDivisionPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{division}</Text>
                                    {selectedDivision === division && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Admit Modal */}
            <Modal
                visible={showAdmitModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowAdmitModal(false);
                    setAdmitReason('');
                    setChildToAdmit(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={styles.admitModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.admitModalTitle}>Notice from site thenest.camp</Text>
                        <Text style={styles.admitModalSubtitle}>Reason for admission (optional)</Text>

                        <TextInput
                            style={styles.admitReasonInput}
                            placeholder="Enter reason..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={admitReason}
                            onChangeText={setAdmitReason}
                            multiline={true}
                            numberOfLines={4}
                        />

                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleAdmitChild}
                        >
                            <Text style={styles.confirmButtonText}>Confirm</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowAdmitModal(false);
                                setAdmitReason('');
                                setChildToAdmit(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </View>
            </Modal>

            {/* Child Picker Modal for Add Medication */}
            <Modal
                visible={showChildPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowChildPicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowChildPicker(false)}
                >
                    <Pressable
                        style={styles.pickerModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Child</Text>
                            <TouchableOpacity onPress={() => setShowChildPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerContent}>
                            {filteredChildren.map((child: any) => (
                                <TouchableOpacity
                                    key={child.id}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedMedicationChild(child.name);
                                        setShowChildPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{child.name}</Text>
                                    {selectedMedicationChild === child.name && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Upload CSV Modal */}
            <Modal
                visible={showUploadModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUploadModal(false)}
            >
                <Pressable
                    style={styles.uploadModalOverlay}
                    onPress={() => setShowUploadModal(false)}
                >
                    <Pressable
                        style={styles.uploadModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.uploadModalTitle}>Select file</Text>

                        <TouchableOpacity
                            style={styles.uploadOption}
                            onPress={() => {
                                // Handle Aloha downloads selection
                                console.log('Selected: Aloha downloads');
                                setShowUploadModal(false);
                            }}
                        >
                            <Ionicons name="folder-outline" size={24} color={theme.colors.text} />
                            <Text style={styles.uploadOptionText}>Aloha downloads</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.uploadOption}
                            onPress={() => {
                                // Handle Other files selection
                                console.log('Selected: Other files');
                                setShowUploadModal(false);
                            }}
                        >
                            <Ionicons name="document-outline" size={24} color={theme.colors.text} />
                            <Text style={styles.uploadOptionText}>Other files</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
    },
    loadingText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    errorTitle: {
        ...theme.typography.h2,
        color: theme.colors.text,
        textAlign: 'center',
    },
    errorMessage: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        width: '100%',
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        flexShrink: 1,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    viewControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
    },
    viewControlBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        flexShrink: 1,
        minWidth: 80,
    },
    viewControlBtnActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    viewControlText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    viewControlTextActive: {
        color: 'white',
    },
    viewControlIcon: {
        padding: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        flexShrink: 1,
        minWidth: 100,
    },
    uploadBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 12,
        flexShrink: 1,
    },
    searchFilterSection: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
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
        height: 44,
        minWidth: 150,
        flexShrink: 1,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    dropdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        minWidth: 120,
        flexShrink: 1,
        flex: 1,
        maxWidth: 200,
    },
    dropdownText: {
        fontSize: 14,
        color: theme.colors.text,
        flexShrink: 1,
        flex: 1,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    sortBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    tabsContainer: {
        marginBottom: theme.spacing.md,
    },
    tabsContent: {
        gap: theme.spacing.sm,
        paddingRight: theme.spacing.md,
    },
    tab: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexShrink: 0,
    },
    tabActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        flexShrink: 0,
    },
    tabTextActive: {
        color: 'white',
    },
    medicationLogCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 300,
        width: '100%',
    },
    logTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    logDescription: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.xl,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'flex-end',
    },
    pickerModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        height: '50%',
        paddingBottom: theme.spacing.xl,
        width: '100%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    pickerContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    // Upload CSV Modal Styles
    uploadModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    calendarCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        width: '100%',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    calendarMonthYear: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    weekDaysContainer: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm,
    },
    weekDay: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    weekDayText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
    },
    calendarDay: {
        width: '14.28%',
        minWidth: 40,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    calendarDayOtherMonth: {
        opacity: 0.3,
    },
    calendarDaySelected: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
    },
    calendarDayToday: {
        backgroundColor: '#FFA500',
        borderRadius: theme.borderRadius.md,
    },
    calendarDayText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    calendarDayTextOtherMonth: {
        color: theme.colors.textSecondary,
    },
    calendarDayTextSelected: {
        color: 'white',
        fontWeight: '700',
    },
    calendarDayTextToday: {
        color: 'white',
        fontWeight: '700',
    },
    calendarDayDot: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.secondary,
    },
    medicationDateCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 200,
    },
    medicationDateTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    pastDateText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    // Today's Medications Styles
    todaysMedicationsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 400,
        width: '100%',
    },
    todaysMedicationsTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    todaysMedicationsSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    rfidCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
    },
    rfidHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    rfidTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        flexShrink: 1,
        flex: 1,
    },
    rfidDescription: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    rfidInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    rfidInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        height: 44,
        outlineWidth: 0,
        outlineColor: 'transparent',
        minWidth: 150,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        height: 44,
        flexShrink: 0,
        minWidth: 70,
    },
    scanButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    clearButton: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        height: 44,
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: 60,
    },
    clearButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    emptyStateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xl,
    },
    emptyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.secondary,
    },
    // Floating Action Button
    fab: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        right: theme.spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1000,
    },
    // Health Center Styles
    healthCenterContainer: {
        width: '100%',
    },
    healthCenterHeader: {
        marginBottom: theme.spacing.lg,
    },
    healthCenterTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    healthCenterTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    healthCenterSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    searchChildrenSection: {
        marginBottom: theme.spacing.lg,
    },
    searchChildrenTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    searchChildrenInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    searchChildrenInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.xs,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    availableChildrenSection: {
        width: '100%',
    },
    availableChildrenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    availableChildrenTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    childrenList: {
        maxHeight: 500,
        width: '100%',
    },
    childCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        width: '100%',
    },
    childCardSelected: {
        backgroundColor: '#FFA500',
        borderColor: '#FFA500',
    },
    childCardContent: {
        flex: 1,
    },
    childName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    childNameSelected: {
        color: 'white',
    },
    childDivisionTag: {
        alignSelf: 'flex-start',
    },
    childDivisionText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    childDivisionTextSelected: {
        color: 'white',
    },
    admitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    admitButtonSelected: {
        backgroundColor: '#FFA500',
        borderColor: '#FFA500',
    },
    admitButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    admitButtonTextSelected: {
        color: 'white',
    },
    // Admit Modal Styles
    admitModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        marginHorizontal: theme.spacing.lg,
        width: '90%',
        maxWidth: 500,
        alignSelf: 'center',
        marginTop: '20%',
    },
    admitModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    admitModalSubtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    admitReasonInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: theme.spacing.lg,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    confirmButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    confirmButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    cancelButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
    },
    cancelButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    // Health Center Log Styles
    healthCenterLogCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 400,
        width: '100%',
    },
    healthCenterLogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    healthCenterLogTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    healthCenterLogSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    currentlyAdmittedSection: {
        marginBottom: theme.spacing.lg,
    },
    currentlyAdmittedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    currentlyAdmittedTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    admittedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    admittedCardContent: { flex: 1 },
    admittedCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    admittedCardName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    camperBadge: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    camperBadgeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    admittedCardTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    admittedCardTime: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    durationBadge: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    durationBadgeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    admittedReason: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 4,
    },
    admittedReasonLabel: {
        fontWeight: '600',
    },
    admittedNotes: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    checkOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    checkOutButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    historyGroupCard: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
    },
    historyGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
    },
    historyGroupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    historyGroupName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    historyGroupDivision: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    historyGroupMeta: {
        alignItems: 'flex-end',
        marginRight: theme.spacing.sm,
    },
    admissionCountBadge: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 4,
    },
    admissionCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    historyLastDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    historyGroupDetails: {
        padding: theme.spacing.md,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    historyDetailBlock: {
        borderLeftWidth: 2,
        borderLeftColor: 'rgba(59, 130, 246, 0.5)',
        paddingLeft: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    historyDetailTitle: {
        fontWeight: '600',
        fontSize: 14,
        color: theme.colors.text,
    },
    historyDetailTime: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    historyDetailReason: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 4,
    },
    historyDetailNotes: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    medicationCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    medicationCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    medicationCardName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    medicationCardBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeGiven: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    statusBadgeGivenText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10b981',
    },
    statusBadgePending: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    statusBadgePendingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f59e0b',
    },
    medicationCardIconBtn: {
        padding: 4,
    },
    medicationCardDetail: {
        fontSize: 14,
        color: theme.colors.text,
    },
    medicationCardTime: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    medicationCardDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    medicationCardDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    markAdministeredButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    markAdministeredButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    dailyLogChildCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    dailyLogChildHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    dailyLogChildName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    divisionTagSmall: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    divisionTagSmallText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    dailyLogMedRow: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    dailyLogMedDetail: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dailyLogMedTime: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // Add Medication Styles
    addMedicationCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        width: '100%',
    },
    addMedicationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    addMedicationTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    addMedicationSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    formContainer: {
        width: '100%',
    },
    formField: {
        marginBottom: theme.spacing.lg,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    childPickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        height: 44,
    },
    childPickerText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    childPickerPlaceholder: {
        color: theme.colors.textSecondary,
    },
    formInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        height: 44,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    mealTimeContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    mealTimeColumn: {
        flex: 1,
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleSelected: {
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.secondary,
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    radioLabel: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    formTextArea: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 100,
        textAlignVertical: 'top',
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    checkboxLabel: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    addMedicationButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    addMedicationButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },

    // Upload CSV Modal Styles
    uploadModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        height: '50%',
    },
    uploadModalTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    uploadOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    uploadOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
});
