import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Interfaces
interface Child {
    id: string;
    name: string;
    division_id: string | null;
}

interface Staff {
    id: string;
    name: string;
    department: string | null;
}

interface Appointment {
    id: string;
    child_id: string | null;
    staff_id: string | null;
    appointment_type: string;
    appointment_date: string;
    appointment_time: string | null;
    provider_name: string | null;
    location: string | null;
    notes: string | null;
    status: string;
    outcome: string | null;
    follow_up_required: boolean;
    follow_up_date: string | null;
    child?: Child;
    staff?: Staff;
    season: string;
    company_id: string;
}

// Mock data removed in favor of Supabase data

// Appointment types (for filter)
const APPOINTMENT_TYPES = [
    'All Types',
    'Orthodontist',
    'Physical Therapy',
    'Dentist',
    'Optometrist',
    'General Physician',
    'Specialist',
    'Mental Health',
    'Other',
];

// Appointment types (for form dropdown)
const APPOINTMENT_TYPE_OPTIONS = [
    'Orthodontist',
    'Physical Therapy',
    'Dentist',
    'Optometrist',
    'General Physician',
    'Specialist',
    'Mental Health',
    'Other',
];

// Appointment statuses (for filter)
const APPOINTMENT_STATUSES = [
    'All Status',
    'Scheduled',
    'Completed',
    'Cancelled',
    'Rescheduled',
];

// Appointment statuses (for form dropdown)
const APPOINTMENT_STATUS_OPTIONS = [
    'Scheduled',
    'Completed',
    'Cancelled',
    'Rescheduled',
];

type AppointmentTab = 'Upcoming' | 'Past' | 'All';

export const AppointmentsScreen = ({ navigation }: any) => {
    const queryClient = useQueryClient();

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
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // Data Queries
    const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
        queryKey: ['appointments', companyId, selectedYear],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    child:child_id(id, name, division_id),
                    staff:staff_id(id, name, department)
                `)
                .eq('company_id', companyId)
                .eq('season', selectedYear)
                .order('appointment_date', { ascending: true });

            if (error) throw error;
            return (data || []) as Appointment[];
        },
        enabled: !!companyId
    });

    const { data: children = [] } = useQuery({
        queryKey: ['children', companyId, selectedYear],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('children')
                .select('id, name, division_id')
                .eq('company_id', companyId)
                .eq('season', selectedYear)
                .order('name');
            if (error) throw error;
            return (data || []) as Child[];
        },
        enabled: !!companyId
    });

    const { data: staff = [] } = useQuery({
        queryKey: ['staff', companyId, selectedYear],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('staff')
                .select('id, name, department')
                .eq('company_id', companyId)
                .eq('season', selectedYear)
                .order('name');
            if (error) throw error;
            return (data || []) as Staff[];
        },
        enabled: !!companyId
    });

    // Mutations
    const addAppointmentMutation = useMutation({
        mutationFn: async (newAppointment: any) => {
            const { data, error } = await supabase
                .from('appointments')
                .insert([{ ...newAppointment, company_id: companyId, season: selectedYear }])
                .select()
                .single();
            if (error) throw error;

            // Send notification
            await supabase.functions.invoke('send-appointment-notification', {
                body: { appointment_id: data.id, action: 'create' }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            Alert.alert('Success', 'Appointment scheduled successfully');
            setIsAddModalOpen(false);
            // resetFormData(); // Will be handled in UI logic
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to schedule appointment');
        }
    });

    const updateAppointmentMutation = useMutation({
        mutationFn: async (updatedAppointment: any) => {
            const { id, ...updateData } = updatedAppointment;
            const { error } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Send notification
            await supabase.functions.invoke('send-appointment-notification', {
                body: { appointment_id: id, action: 'update' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            Alert.alert('Success', 'Appointment updated successfully');
            setIsEditModalOpen(false);
            setEditingAppointment(null);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to update appointment');
        }
    });

    const deleteAppointmentMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            Alert.alert('Success', 'Appointment deleted successfully');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to delete appointment');
        }
    });
    const [activeTab, setActiveTab] = useState<AppointmentTab>('Upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [selectedType, setSelectedType] = useState('All Types');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<any>(null);
    const [appointmentFor, setAppointmentFor] = useState<'Camper' | 'Staff'>('Camper');
    const [isFormTypeDropdownOpen, setIsFormTypeDropdownOpen] = useState(false);
    const [isFormStatusDropdownOpen, setIsFormStatusDropdownOpen] = useState(false);
    const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
    const [personSearchText, setPersonSearchText] = useState('');
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        person: '',
        personId: '',
        type: '',
        provider: '',
        location: '',
        status: 'Scheduled',
        notes: '',
        outcome: '',
        followUpRequired: false,
        followUpDate: '',
    });

    // Date/Time Picker State
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState({ hour: 12, minute: 0, ampm: 'PM' });
    const [currentDateField, setCurrentDateField] = useState<'date' | 'followUpDate'>('date');

    // Helper to format date for display in the picker header
    const formatDateForPickerDisplay = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Helper to format date for storage (YYYY-MM-DD)
    const formatDateForStorage = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const confirmDateSelection = () => {
        const dateString = formatDateForStorage(selectedDate);
        if (currentDateField === 'followUpDate') {
            setFormData({ ...formData, followUpDate: dateString });
        } else {
            setFormData({ ...formData, date: dateString });
        }
        setIsDatePickerOpen(false);
    };

    const confirmTimeSelection = () => {
        const timeString = `${selectedTime.hour}:${String(selectedTime.minute).padStart(2, '0')} ${selectedTime.ampm}`;
        setFormData({ ...formData, time: timeString });
        setIsTimePickerOpen(false);
    };

    // Filter appointments based on active tab, search, type, and status
    const filteredAppointments = (appointments || []).filter((appointment: Appointment) => {
        if (!appointment.appointment_date) return false;

        // Tab filter
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Parse YYYY-MM-DD
        const [year, month, day] = appointment.appointment_date.split('-').map(Number);
        const appointmentDate = new Date(year, month - 1, day);

        if (activeTab === 'Upcoming' && appointmentDate < now) return false;
        if (activeTab === 'Past' && appointmentDate >= now) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const personName = appointment.child?.name || appointment.staff?.name || '';
            if (
                !personName.toLowerCase().includes(query) &&
                !appointment.provider_name?.toLowerCase().includes(query) &&
                !appointment.appointment_type?.toLowerCase().includes(query)
            ) {
                return false;
            }
        }

        // Type filter
        if (selectedType !== 'All Types' && appointment.appointment_type !== selectedType) {
            return false;
        }

        // Status filter
        if (selectedStatus !== 'All Status' && appointment.status !== selectedStatus) {
            return false;
        }

        return true;
    });

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateTime = (dateString: string | null, timeString: string | null) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (timeString) {
            return `${dateStr} at ${timeString}`;
        }
        return dateStr;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Scheduled':
                return theme.colors.secondary;
            case 'Completed':
                return theme.colors.success;
            case 'Cancelled':
                return theme.colors.danger;
            case 'Rescheduled':
                return theme.colors.warning;
            default:
                return theme.colors.textSecondary;
        }
    };

    const handleAddAppointment = () => {
        setFormData({
            date: formatDateForStorage(new Date()),
            time: '',
            person: '',
            personId: '',
            type: '',
            provider: '',
            location: '',
            status: 'Scheduled',
            notes: '',
            outcome: '',
            followUpRequired: false,
            followUpDate: '',
        });
        setAppointmentFor('Camper');
        setEditingAppointment(null);
        setIsAddModalOpen(true);
    };

    const handleEditAppointment = (appointment: Appointment) => {
        const personName = appointment.child?.name || appointment.staff?.name || '';
        const personId = appointment.child_id || appointment.staff_id || '';
        const isCamper = !!appointment.child_id;

        setAppointmentFor(isCamper ? 'Camper' : 'Staff');

        setFormData({
            date: appointment.appointment_date,
            time: appointment.appointment_time || '',
            person: personName,
            personId: personId,
            type: appointment.appointment_type,
            provider: appointment.provider_name || '',
            location: appointment.location || '',
            status: appointment.status,
            notes: appointment.notes || '',
            outcome: appointment.outcome || '',
            followUpRequired: appointment.follow_up_required,
            followUpDate: appointment.follow_up_date || '',
        });
        setEditingAppointment(appointment);
        setIsEditModalOpen(true);
    };

    const handleSave = () => {
        // Validation
        if (!formData.date || !formData.type || !formData.personId) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const payload = {
            appointment_date: formData.date,
            appointment_time: formData.time || null,
            appointment_type: formData.type,
            child_id: appointmentFor === 'Camper' ? formData.personId : null,
            staff_id: appointmentFor === 'Staff' ? formData.personId : null,
            provider_name: formData.provider || null,
            location: formData.location || null,
            status: formData.status,
            notes: formData.notes || null,
            outcome: formData.outcome || null,
            follow_up_required: formData.followUpRequired,
            follow_up_date: formData.followUpRequired ? formData.followUpDate : null,
        };

        if (editingAppointment) {
            updateAppointmentMutation.mutate({ id: editingAppointment.id, ...payload });
        } else {
            addAppointmentMutation.mutate(payload);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {/* Top Row: Sidebar and Profile */}
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
                {/* Title Row */}
                <View style={styles.headerTitleContainer}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                        <Text style={styles.headerTitle}>Appointments</Text>
                    </View>
                    <Text style={styles.headerSubtitle}>
                        Manage medical and therapy appointments for campers and staff
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Action Button */}
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.addButton} onPress={handleAddAppointment}>
                        <Ionicons name="add" size={20} color={theme.colors.surface} />
                        <Text style={styles.addButtonText}>Add Appointment</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {(['Upcoming', 'Past', 'All'] as AppointmentTab[]).map((tab) => (
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
                </View>

                {/* Filters */}
                <View style={styles.filtersContainer}>
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Dropdowns */}
                    <View style={styles.dropdownsContainer}>
                        {/* Type Dropdown */}
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => {
                                setIsTypeDropdownOpen(!isTypeDropdownOpen);
                                setIsStatusDropdownOpen(false);
                            }}
                        >
                            <Text style={styles.dropdownText}>{selectedType}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Status Dropdown */}
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => {
                                setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                setIsTypeDropdownOpen(false);
                            }}
                        >
                            <Text style={styles.dropdownText}>{selectedStatus}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Type Dropdown Modal - Bottom Sheet */}
                <Modal
                    visible={isTypeDropdownOpen}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsTypeDropdownOpen(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setIsTypeDropdownOpen(false)}
                    >
                        <Pressable
                            style={styles.typeBottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {/* Bottom Sheet Header */}
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Type</Text>
                            </View>

                            {/* Bottom Sheet Options */}
                            <View style={styles.bottomSheetContent}>
                                <ScrollView
                                    style={styles.typeBottomSheetScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {APPOINTMENT_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={styles.bottomSheetOption}
                                            onPress={() => {
                                                setSelectedType(type);
                                                setIsTypeDropdownOpen(false);
                                            }}
                                        >
                                            <Ionicons
                                                name={selectedType === type ? "radio-button-on" : "radio-button-off"}
                                                size={24}
                                                color={selectedType === type ? theme.colors.secondary : theme.colors.textSecondary}
                                            />
                                            <Text style={styles.bottomSheetOptionText}>
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Status Dropdown Modal - Bottom Sheet */}
                <Modal
                    visible={isStatusDropdownOpen}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsStatusDropdownOpen(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setIsStatusDropdownOpen(false)}
                    >
                        <Pressable
                            style={styles.statusBottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {/* Bottom Sheet Header */}
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Status</Text>
                            </View>

                            {/* Bottom Sheet Options */}
                            <View style={styles.bottomSheetContent}>
                                <ScrollView
                                    style={styles.statusBottomSheetScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {APPOINTMENT_STATUSES.map((status) => (
                                        <TouchableOpacity
                                            key={status}
                                            style={styles.bottomSheetOption}
                                            onPress={() => {
                                                setSelectedStatus(status);
                                                setIsStatusDropdownOpen(false);
                                            }}
                                        >
                                            <Ionicons
                                                name={selectedStatus === status ? "radio-button-on" : "radio-button-off"}
                                                size={24}
                                                color={selectedStatus === status ? theme.colors.secondary : theme.colors.textSecondary}
                                            />
                                            <Text style={styles.bottomSheetOptionText}>
                                                {status}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Appointments List */}
                <View style={styles.appointmentsSection}>
                    <Text style={styles.sectionTitle}>Appointments</Text>
                    <Text style={styles.sectionSubtitle}>
                        {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found
                    </Text>

                    {filteredAppointments.length === 0 ? (
                        <StyledCard style={styles.emptyCard}>
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                                <Text style={styles.emptyStateText}>No appointments found</Text>
                            </View>
                        </StyledCard>
                    ) : (
                        <View style={styles.appointmentsList}>
                            {filteredAppointments.map((appointment: any, index: number) => (
                                <StyledCard key={appointment.id || index} style={styles.appointmentCard}>
                                    <TouchableOpacity
                                        onPress={() => handleEditAppointment(appointment)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Card Header */}
                                        <View style={styles.appointmentCardHeader}>
                                            <View style={styles.appointmentCardTitleContainer}>
                                                <Text style={styles.appointmentCardTitle}>
                                                    {appointment.child?.name || appointment.staff?.name || 'Unnamed Person'}
                                                </Text>
                                                <Text style={styles.appointmentCardDate}>
                                                    {formatDateTime(appointment.appointment_date, appointment.appointment_time)}
                                                </Text>
                                            </View>
                                            <View style={styles.appointmentCardActions}>
                                                <Pressable
                                                    style={({ pressed }) => [
                                                        styles.actionIconButton,
                                                        pressed && styles.actionIconButtonPressed
                                                    ]}
                                                    onPress={() => handleEditAppointment(appointment)}
                                                >
                                                    <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
                                                </Pressable>
                                                <Pressable
                                                    style={({ pressed }) => [
                                                        styles.actionIconButton,
                                                        pressed && styles.actionIconButtonPressed,
                                                        { marginLeft: 8 }
                                                    ]}
                                                    onPress={() => {
                                                        Alert.alert(
                                                            'Delete Appointment',
                                                            'Are you sure you want to delete this appointment?',
                                                            [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                {
                                                                    text: 'Delete',
                                                                    style: 'destructive',
                                                                    onPress: () => deleteAppointmentMutation.mutate(appointment.id)
                                                                }
                                                            ]
                                                        );
                                                    }}
                                                >
                                                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                                                </Pressable>
                                            </View>
                                        </View>

                                        {/* Card Content */}
                                        <View style={styles.appointmentCardContent}>
                                            <View style={styles.appointmentInfoRow}>
                                                <Ionicons name="medical-outline" size={18} color={theme.colors.textSecondary} style={styles.infoIcon} />
                                                <View style={styles.appointmentInfo}>
                                                    <Text style={styles.appointmentInfoLabel}>Type</Text>
                                                    <Text style={styles.appointmentInfoValue}>{appointment.appointment_type || '-'}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.appointmentInfoRow}>
                                                <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} style={styles.infoIcon} />
                                                <View style={styles.appointmentInfo}>
                                                    <Text style={styles.appointmentInfoLabel}>Provider</Text>
                                                    <Text style={styles.appointmentInfoValue}>{appointment.provider_name || '-'}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.appointmentCardBadges}>
                                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                                                    <Text style={[styles.statusBadgeText, { color: getStatusColor(appointment.status) }]}>
                                                        {appointment.status || 'Scheduled'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </StyledCard>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add/Edit Appointment Modal - Centered Popup */}
            <Modal
                visible={isAddModalOpen || isEditModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingAppointment(null);
                }}
            >
                <Pressable
                    style={styles.centeredOverlay}
                    onPress={() => {
                        setIsAddModalOpen(false);
                        setIsEditModalOpen(false);
                        setEditingAppointment(null);
                    }}
                >
                    <Pressable
                        style={styles.centeredModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView
                            style={styles.addAppointmentBottomSheetScroll}
                            contentContainerStyle={styles.addAppointmentBottomSheetContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Modal Header */}
                            <View style={styles.editModalHeader}>
                                <View style={styles.editModalTitleContainer}>
                                    <Text style={styles.editModalTitle}>
                                        {editingAppointment ? 'Edit Appointment' : 'Add Appointment'}
                                    </Text>
                                    <Text style={styles.editModalSubtitle}>
                                        Schedule a new appointment for a camper or staff member
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsAddModalOpen(false);
                                        setIsEditModalOpen(false);
                                        setEditingAppointment(null);
                                    }}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Appointment For Toggle */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Appointment For</Text>
                                <View style={styles.toggleContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.toggleButton,
                                            appointmentFor === 'Camper' && styles.toggleButtonActive
                                        ]}
                                        onPress={() => {
                                            setAppointmentFor('Camper');
                                            setFormData({ ...formData, person: '', personId: '' });
                                        }}
                                    >
                                        <Text style={[
                                            styles.toggleButtonText,
                                            appointmentFor === 'Camper' && styles.toggleButtonTextActive
                                        ]}>
                                            Camper
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.toggleButton,
                                            appointmentFor === 'Staff' && styles.toggleButtonActive
                                        ]}
                                        onPress={() => {
                                            setAppointmentFor('Staff');
                                            setFormData({ ...formData, person: '', personId: '' });
                                            setPersonSearchText('');
                                        }}
                                    >
                                        <Text style={[
                                            styles.toggleButtonText,
                                            appointmentFor === 'Staff' && styles.toggleButtonTextActive
                                        ]}>
                                            Staff
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Select Camper/Staff Member */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>
                                    Select {appointmentFor} <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.formInputDropdown}
                                    onPress={() => setIsPersonDropdownOpen(true)}
                                >
                                    <Text style={formData.person ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.person || `Search ${appointmentFor.toLowerCase()}s...`}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Appointment Type */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>
                                    Appointment Type <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.formInputDropdown}
                                    onPress={() => setIsFormTypeDropdownOpen(true)}
                                >
                                    <Text style={formData.type ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.type || 'Select type...'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Date */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>
                                    Date <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.formInputWithIcon}
                                    onPress={() => {
                                        if (formData.date) {
                                            const [y, m, d] = formData.date.split('-').map(Number);
                                            setSelectedDate(new Date(y, m - 1, d));
                                        } else {
                                            setSelectedDate(new Date());
                                        }
                                        setCurrentDateField('date');
                                        setIsDatePickerOpen(true);
                                    }}
                                >
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <Text style={formData.date ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.date ? formatDate(formData.date) : 'Pick a date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Time */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Time</Text>
                                <TouchableOpacity
                                    style={styles.formInputWithIconRight}
                                    onPress={() => setIsTimePickerOpen(true)}
                                >
                                    <Text style={formData.time ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.time || '--:-- --'}
                                    </Text>
                                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIconRight} />
                                </TouchableOpacity>
                            </View>

                            {/* Status */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Status</Text>
                                <TouchableOpacity
                                    style={styles.formInputDropdown}
                                    onPress={() => setIsFormStatusDropdownOpen(true)}
                                >
                                    <Text style={styles.formInputText}>
                                        {formData.status || 'Scheduled'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Provider Name */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Provider Name</Text>
                                <TextInput
                                    style={styles.formTextInput}
                                    placeholder="Dr. Smith"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={formData.provider}
                                    onChangeText={(text) => setFormData({ ...formData, provider: text })}
                                />
                            </View>

                            {/* Location */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Location</Text>
                                <TextInput
                                    style={styles.formTextInput}
                                    placeholder="123 Medical Center"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={formData.location}
                                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                                />
                            </View>

                            {/* Outcome (for editing) */}
                            {editingAppointment && (
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Outcome</Text>
                                    <TextInput
                                        style={[styles.formTextInput, styles.formTextArea]}
                                        placeholder="Appointment outcome..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={formData.outcome}
                                        onChangeText={(text) => setFormData({ ...formData, outcome: text })}
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>
                            )}

                            {/* Follow-up Required */}
                            <View style={styles.checkboxContainer}>
                                <Switch
                                    value={formData.followUpRequired}
                                    onValueChange={(value) => setFormData({ ...formData, followUpRequired: value })}
                                    trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                                    thumbColor="#ffffff"
                                    // @ts-ignore
                                    activeThumbColor="#ffffff"
                                    ios_backgroundColor="#e2e8f0"
                                />
                                <Text style={styles.checkboxLabel}>Follow-up Required</Text>
                            </View>

                            {/* Follow-up Date */}
                            {formData.followUpRequired && (
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>
                                        Follow-up Date <Text style={styles.requiredStar}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.formInputWithIcon}
                                        onPress={() => {
                                            if (formData.followUpDate) {
                                                const [y, m, d] = formData.followUpDate.split('-').map(Number);
                                                setSelectedDate(new Date(y, m - 1, d));
                                            } else {
                                                setSelectedDate(new Date());
                                            }
                                            setCurrentDateField('followUpDate');
                                            setIsDatePickerOpen(true);
                                        }}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                        <Text style={formData.followUpDate ? styles.formInputText : styles.formInputPlaceholder}>
                                            {formData.followUpDate ? formatDate(formData.followUpDate) : 'Pick a date'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.cancelButton,
                                        pressed && styles.cancelButtonPressed
                                    ]}
                                    onPress={() => {
                                        setIsAddModalOpen(false);
                                        setIsEditModalOpen(false);
                                        setEditingAppointment(null);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </Pressable>
                                <TouchableOpacity
                                    style={styles.updateButton}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.updateButtonText}>
                                        {editingAppointment ? 'Update Appointment' : 'Create Appointment'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Type Dropdown Modal */}
            <Modal
                visible={isFormTypeDropdownOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsFormTypeDropdownOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setIsFormTypeDropdownOpen(false)}
                >
                    <Pressable
                        style={styles.typeBottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Type</Text>
                        </View>
                        <View style={styles.bottomSheetContent}>
                            <ScrollView style={styles.typeBottomSheetScroll} showsVerticalScrollIndicator={false}>
                                {APPOINTMENT_TYPE_OPTIONS.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.bottomSheetOption,
                                            formData.type === type && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setFormData({ ...formData, type });
                                            setIsFormTypeDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            formData.type === type && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {type}
                                        </Text>
                                        {formData.type === type && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Status Dropdown Modal */}
            <Modal
                visible={isFormStatusDropdownOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsFormStatusDropdownOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setIsFormStatusDropdownOpen(false)}
                >
                    <Pressable
                        style={styles.statusBottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Status</Text>
                        </View>
                        <View style={styles.bottomSheetContent}>
                            <ScrollView style={styles.statusBottomSheetScroll} showsVerticalScrollIndicator={false}>
                                {APPOINTMENT_STATUS_OPTIONS.map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.bottomSheetOption,
                                            formData.status === status && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setFormData({ ...formData, status });
                                            setIsFormStatusDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            formData.status === status && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {status}
                                        </Text>
                                        {formData.status === status && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Person Dropdown Modal */}
            <Modal
                visible={isPersonDropdownOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setIsPersonDropdownOpen(false);
                    setPersonSearchText('');
                }}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => {
                        setIsPersonDropdownOpen(false);
                        setPersonSearchText('');
                    }}
                >
                    <Pressable
                        style={styles.typeBottomSheet} // Reusing typeBottomSheet for similar height
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select {appointmentFor}</Text>
                        </View>
                        <View style={{ paddingBottom: 16, paddingHorizontal: 16 }}>
                            <View style={styles.dropdownSearchContainer}>
                                <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.dropdownSearchIcon} />
                                <TextInput
                                    style={styles.dropdownSearchInput}
                                    placeholder={`Search ${appointmentFor.toLowerCase()}s...`}
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={personSearchText}
                                    onChangeText={setPersonSearchText}
                                />
                            </View>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                            {(appointmentFor === 'Camper' ? children : staff)
                                .filter((person: any) =>
                                    person.name.toLowerCase().includes(personSearchText.toLowerCase())
                                )
                                .map((person) => {
                                    const isSelected = formData.personId === person.id;
                                    return (
                                        <TouchableOpacity
                                            key={person.id}
                                            style={[
                                                styles.bottomSheetOption,
                                                isSelected && styles.bottomSheetOptionSelected
                                            ]}
                                            onPress={() => {
                                                setFormData({ ...formData, person: person.name, personId: person.id });
                                                setIsPersonDropdownOpen(false);
                                                setPersonSearchText('');
                                            }}
                                        >
                                            <Text style={[
                                                styles.bottomSheetOptionText,
                                                isSelected && styles.bottomSheetOptionTextSelected
                                            ]}>
                                                {person.name}
                                            </Text>
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={isDatePickerOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsDatePickerOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setIsDatePickerOpen(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setIsDatePickerOpen(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.pickerContent}>
                            {/* Month */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Month</Text>
                                <ScrollView
                                    style={styles.pickerScroll}
                                    contentContainerStyle={{ alignItems: 'center' }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        const isSelected = selectedDate.getMonth() + 1 === month;
                                        return (
                                            <TouchableOpacity
                                                key={month}
                                                style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                                onPress={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setMonth(month - 1);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                                                    {monthNames[month - 1]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Day */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Day</Text>
                                <ScrollView
                                    style={styles.pickerScroll}
                                    contentContainerStyle={{ alignItems: 'center' }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                        const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                                        const isSelected = selectedDate.getDate() === day;
                                        const isValid = day <= daysInMonth;
                                        if (!isValid) return null;
                                        return (
                                            <TouchableOpacity
                                                key={day}
                                                style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                                onPress={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setDate(day);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Year */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Year</Text>
                                <ScrollView
                                    style={styles.pickerScroll}
                                    contentContainerStyle={{ alignItems: 'center' }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 1 + i).map((year) => {
                                        const isSelected = selectedDate.getFullYear() === year;
                                        return (
                                            <TouchableOpacity
                                                key={year}
                                                style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                                onPress={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setFullYear(year);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                                                    {year}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.pickerDisplay}>
                            <Text style={styles.pickerDisplayText}>{formatDateForPickerDisplay(selectedDate)}</Text>
                        </View>

                        <View style={styles.pickerActions}>
                            <TouchableOpacity style={styles.pickerCancelButton} onPress={() => setIsDatePickerOpen(false)}>
                                <Text style={styles.pickerCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerConfirmButton} onPress={confirmDateSelection}>
                                <Text style={styles.pickerConfirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Time Picker Modal */}
            <Modal
                visible={isTimePickerOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsTimePickerOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setIsTimePickerOpen(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Time</Text>
                            <TouchableOpacity onPress={() => setIsTimePickerOpen(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.pickerContent}>
                            {/* Hour */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Hour</Text>
                                <ScrollView
                                    style={styles.pickerScroll}
                                    contentContainerStyle={{ alignItems: 'center' }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                                        <TouchableOpacity
                                            key={hour}
                                            style={[styles.pickerOption, selectedTime.hour === hour && styles.pickerOptionSelected]}
                                            onPress={() => setSelectedTime({ ...selectedTime, hour })}
                                        >
                                            <Text style={[styles.pickerOptionText, selectedTime.hour === hour && styles.pickerOptionTextSelected]}>
                                                {hour}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Minute */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Minute</Text>
                                <ScrollView
                                    style={styles.pickerScroll}
                                    contentContainerStyle={{ alignItems: 'center' }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                                        <TouchableOpacity
                                            key={minute}
                                            style={[styles.pickerOption, selectedTime.minute === minute && styles.pickerOptionSelected]}
                                            onPress={() => setSelectedTime({ ...selectedTime, minute })}
                                        >
                                            <Text style={[styles.pickerOptionText, selectedTime.minute === minute && styles.pickerOptionTextSelected]}>
                                                {minute.toString().padStart(2, '0')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* AM/PM */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Period</Text>
                                <ScrollView
                                    style={styles.pickerScroll}
                                    contentContainerStyle={{ alignItems: 'center' }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {['AM', 'PM'].map((period) => (
                                        <TouchableOpacity
                                            key={period}
                                            style={[styles.pickerOption, selectedTime.ampm === period && styles.pickerOptionSelected]}
                                            onPress={() => setSelectedTime({ ...selectedTime, ampm: period })}
                                        >
                                            <Text style={[styles.pickerOptionText, selectedTime.ampm === period && styles.pickerOptionTextSelected]}>
                                                {period}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.pickerDisplay}>
                            <Text style={styles.pickerDisplayText}>
                                {selectedTime.hour}:{selectedTime.minute.toString().padStart(2, '0')} {selectedTime.ampm}
                            </Text>
                        </View>

                        <View style={styles.pickerActions}>
                            <TouchableOpacity style={styles.pickerCancelButton} onPress={() => setIsTimePickerOpen(false)}>
                                <Text style={styles.pickerCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerConfirmButton} onPress={confirmTimeSelection}>
                                <Text style={styles.pickerConfirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    headerTitleContainer: {
        paddingLeft: 0,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    headerTitle: {
        ...theme.typography.h1,
        fontSize: 24,
        fontWeight: '700',
    },
    headerSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: theme.spacing.md,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    addButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.xs,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.sm,
        minHeight: 44,
    },
    tabActive: {
        backgroundColor: theme.colors.secondary,
    },
    tabText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    tabTextActive: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    filtersContainer: {
        marginBottom: theme.spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        minHeight: 48,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...theme.typography.body,
        fontSize: 14,
        paddingVertical: theme.spacing.sm,
        color: theme.colors.text,
    },
    clearButton: {
        padding: theme.spacing.xs,
    },
    dropdownsContainer: {
        gap: theme.spacing.sm,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        minHeight: 48,
    },
    dropdownText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        width: '80%',
        maxHeight: '60%',
        ...theme.shadows.card,
    },
    dropdownScroll: {
        maxHeight: 300,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    personDropdownItemSelected: {
        backgroundColor: '#fb923c', // Orange color matching other dropdowns
    },
    personDropdownItemTextSelected: {
        color: theme.colors.surface, // White text on orange background
        fontWeight: '600',
    },
    dropdownItemSelected: {
        backgroundColor: theme.colors.background,
    },
    checkIcon: {
        marginRight: theme.spacing.sm,
    },
    dropdownItemText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownItemTextSelected: {
        color: theme.colors.accent,
        fontWeight: '600',
    },
    appointmentsSection: {
        marginTop: theme.spacing.sm,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    appointmentsList: {
        gap: theme.spacing.md,
    },
    appointmentCard: {
        marginBottom: 0,
    },
    appointmentCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    appointmentCardTitleContainer: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    appointmentCardTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    appointmentCardDate: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    appointmentCardActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    actionIconButton: {
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    actionIconButtonPressed: {
        backgroundColor: '#f3f4f6',
    },
    appointmentCardContent: {
        gap: theme.spacing.md,
    },
    appointmentInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        marginRight: theme.spacing.sm,
        marginTop: 2,
    },
    appointmentInfo: {
        flex: 1,
    },
    appointmentInfoLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs / 2,
    },
    appointmentInfoValue: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    appointmentCardBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xs,
    },
    emptyCard: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    emptyState: {
        alignItems: 'center',
    },
    emptyStateText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        alignSelf: 'flex-start',
    },
    statusBadgeText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
    },
    // Edit Modal Styles
    editModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    editModalScroll: {
        maxHeight: '90%',
    },
    editModalContent: {
        padding: theme.spacing.lg,
    },
    editModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    editModalTitleContainer: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    editModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        marginBottom: theme.spacing.xs,
    },
    editModalSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    formField: {
        marginBottom: theme.spacing.md,
    },
    formLabel: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    formInput: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    formInputDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 48,
    },
    formTextInput: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 48,
    },
    formInputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 48,
    },
    formInputWithIconRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 48,
    },
    formInputText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    formInputPlaceholder: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    inputIcon: {
        marginRight: theme.spacing.sm,
    },
    inputIconRight: {
        marginLeft: theme.spacing.sm,
    },
    requiredStar: {
        color: theme.colors.danger,
    },
    formTextArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    cancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    cancelButtonPressed: {
        backgroundColor: theme.colors.accent,
    },
    cancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    updateButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    updateButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Toggle Styles
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surface,
    },
    toggleButtonActive: {
        backgroundColor: theme.colors.secondary,
    },
    toggleButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    toggleButtonTextActive: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Checkbox Styles
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    checkboxLabel: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    // Dropdown Search Styles
    dropdownSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownSearchIcon: {
        marginRight: theme.spacing.sm,
    },
    dropdownSearchInput: {
        flex: 1,
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    bottomSheetTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bottomSheetContent: {
        gap: theme.spacing.md,
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    bottomSheetOptionSelected: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
    },
    bottomSheetOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    bottomSheetOptionTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Type Bottom Sheet
    typeBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '60%',
    },
    typeBottomSheetScroll: {
        maxHeight: 400,
    },
    // Status Bottom Sheet
    statusBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '50%',
    },
    statusBottomSheetScroll: {
        maxHeight: 300,
    },
    // Add Appointment Bottom Sheet
    addAppointmentBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    addAppointmentBottomSheetScroll: {
        // removed flex: 1 to prevent collapse on mobile
    },
    addAppointmentBottomSheetContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
    },
    // Generic Bottom Sheet Styles for Pickers
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        maxHeight: '80%',
    },
    pickerContent: {
        flexDirection: 'row',
        height: 200,
    },
    pickerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    pickerLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        fontWeight: '600',
    },
    pickerScroll: {
        width: '100%',
    },
    pickerOption: {
        width: 70,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
        borderRadius: 12,
    },
    pickerOptionSelected: {
        backgroundColor: theme.colors.secondary,
    },
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    pickerOptionTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    pickerDisplay: {
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginVertical: theme.spacing.md,
        backgroundColor: theme.colors.background,
    },
    pickerDisplayText: {
        ...theme.typography.h3,
        fontSize: 18,
        color: theme.colors.text,
    },
    pickerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
    },
    pickerCancelButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    pickerCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    pickerConfirmButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
    },
    pickerConfirmButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    // Centered Modal Styles
    centeredOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
        zIndex: 1000,
    },
    centeredModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
        elevation: 5,
        overflow: 'hidden',
    },
});

