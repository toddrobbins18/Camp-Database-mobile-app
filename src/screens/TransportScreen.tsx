import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
    Pressable,
    useWindowDimensions,
    Switch,
    Platform,
    Linking,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCompany } from '../contexts/CompanyContext';
import { useTrips, useAddTrip, useUpdateTrip, useManageTripRoster, useTripAttendees, useTripAttachments } from '../api/transport';
import { useCampers, useDivisions } from '../api/campers';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import * as DocumentPicker from 'expo-document-picker';
import { uploadTripAttachment, getSignedUrl, pathFromFileUrl } from '../api/storage';
import { supabase } from '../lib/supabase';
import { pickAndReadCsvText } from '../lib/pickCsvDocument';
import { uploadCsvFromText } from '../lib/csvTableUpload';
import { UnifiedCalendar, CalendarWidgetEvent } from '../components/UnifiedCalendar';
import { ModalPickerOverlay } from '../components/ModalPickerOverlay';

// Trip Interfaces
interface Trip {
    id: string;
    name: string;
    destination: string;
    date: string; // ISO Date
    end_date?: string; // ISO Date
    is_multi_day: boolean;
    departure_time: string; // HH:mm or HH:mm:ss
    return_time: string;
    attendingCount: number;
    chaperone: string;
    status: 'approved' | 'pending' | 'confirmed';
    type: string; // e.g., 'field_trip', 'sporting_event'
    event_type: string; // e.g., 'Football', 'field-trip'
    transportation_type: string; // e.g., 'bus', 'van'
    event_length?: string; // e.g., 'tournament'
    sports_event_id?: string | null;
    driver?: string;
    meal?: string;
    capacity?: string;
    location_type?: string;
}



const StatusBadge = ({ status }: { status: string }) => {
    let backgroundColor = theme.colors.warning + '20'; // transparent orange
    let color: string = theme.colors.warning;
    let label = 'Pending';

    if (status === 'approved' || status === 'confirmed') {
        backgroundColor = theme.colors.success + '20';
        color = theme.colors.success;
        label = status === 'approved' ? 'Approved' : 'Confirmed';
    } else if (status === 'pending') {
        backgroundColor = theme.colors.danger + '20';
        color = theme.colors.danger;
        label = 'Pending Approval';
    }

    return (
        <View style={[styles.badge, { backgroundColor }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
};

// Roster Interfaces
interface Camper {
    id: string;
    name: string;
    division: string;
    avatar?: string;
    age?: number;
    grade?: string;
    allergies?: string;
    medical_notes?: string;
    group_name?: string;
    gender?: string;
}

interface Division {
    id: string;
    name: string;
    totalCount: number;
}





/** Resolve division id from camper row (children + embedded division). */
function camperDivisionId(camper: any): string | undefined {
    if (camper?.division_id) return String(camper.division_id);
    if (camper?.division && typeof camper.division === 'object' && camper.division.id) return String(camper.division.id);
    if (typeof camper?.division === 'string') return camper.division;
    return undefined;
}

function normalizeTripTypeForDb(type: string): string {
    const t = (type || '').trim();
    const map: Record<string, string> = {
        'Field Trip': 'field_trip',
        'field trip': 'field_trip',
        field_trip: 'field_trip',
        'Sporting Event': 'sporting_event',
        sporting_event: 'sporting_event',
        Other: 'other',
        other: 'other',
    };
    return map[t] || t || 'field_trip';
}

function tripTypeLabel(type: string): string {
    if (type === 'sporting_event') return 'Sporting Event';
    if (type === 'field_trip') return 'Field Trip';
    if (type === 'other') return 'Other';
    return type || 'Field Trip';
}

function transportDbToDisplay(s: string | undefined | null): string {
    if (!s) return 'None';
    const lower = String(s).toLowerCase();
    if (lower === 'bus') return 'Bus';
    if (lower === 'van') return 'Van';
    return s;
}

function transportDisplayToDb(s: string): string | null {
    const l = (s || '').trim().toLowerCase();
    if (!l || l === 'none') return null;
    return l;
}

/** DB times like 05:30 or 14:20 → picker strings e.g. 5:30 AM */
function db24hToPickerTime(s: string | undefined | null): string {
    if (!s?.trim()) return '';
    const parts = String(s).trim().split(':');
    let h = parseInt(parts[0], 10);
    const rawM = parts[1] || '00';
    const m = rawM.replace(/\D/g, '').slice(0, 2) || '00';
    if (Number.isNaN(h)) return '';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.padStart(2, '0')} ${ampm}`;
}

/** Picker "7:00 AM" or DB "07:00" → HH:mm for Supabase */
function pickerTimeToDb24h(s: string): string | null {
    if (!s?.trim()) return null;
    const t = s.trim();
    const upper = t.toUpperCase();
    const match = upper.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2];
        const ap = match[3];
        if (ap === 'PM' && h !== 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m}`;
    }
    if (/^\d{1,2}:\d{2}$/.test(t)) {
        const [h, m] = t.split(':');
        return `${String(parseInt(h, 10)).padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    return t;
}

function multiDayLabel(dateStr: string, endStr?: string): string | null {
    if (!endStr || !dateStr) return null;
    const start = new Date(dateStr + 'T12:00:00');
    const end = new Date(endStr + 'T12:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return `${days}-Day Trip`;
}

const TripCard = ({ trip, onDelete, onEdit, onManageRoster }: { trip: Trip, onDelete: () => void, onEdit: () => void, onManageRoster: () => void }) => {
    const formatDate = (dateString: string, endDateString?: string) => {
        const start = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

        if (endDateString) {
            const end = new Date(endDateString);
            return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
        }
        return start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    };

    const formatTime = (timeString: string) => {
        if (!timeString || !timeString.trim()) return 'N/A';
        const raw = timeString.trim();
        if (/\b(AM|PM)\b/i.test(raw)) return raw;
        const parts = raw.split(':');
        const h = parseInt(parts[0], 10);
        const m = parts[1] ? parts[1].replace(/\D/g, '').slice(0, 2) : '00';
        if (isNaN(h)) return 'N/A';
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.padStart(2, '0')} ${ampm}`;
    };

    const typeLabel = tripTypeLabel(trip.type);
    const multiDayBadge = trip.is_multi_day ? multiDayLabel(trip.date, trip.end_date) : null;

    return (
        <View style={[
            styles.card,
            trip.status === 'pending' ? styles.cardBorderRed : styles.cardBorderGreen,
            (trip.status === 'confirmed' || trip.status === 'approved') && styles.cardBgGreen,
        ]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                    {/* Title and Badges Column */}
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.cardTitle}>{trip.name}</Text>
                        <View style={styles.tagsRow}>
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
                            </View>
                            <StatusBadge status={trip.status} />
                        </View>
                    </View>

                    {/* Action Icons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.manageBtn} onPress={onManageRoster}>
                            <Ionicons name="person" size={14} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
                            <Ionicons name="pencil" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
                            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Secondary Info */}
                <View style={{ marginTop: 4 }}>
                    {multiDayBadge ? (
                        <View style={[styles.durationBadge, { marginBottom: 8, marginTop: 4 }]}>
                            <Text style={styles.durationBadgeText}>{multiDayBadge}</Text>
                        </View>
                    ) : null}
                    <Text style={styles.destinationText}>Destination: {trip.destination || 'N/A'}</Text>
                    <Text style={styles.chaperoneText}>Chaperone: {trip.chaperone || 'N/A'}</Text>
                </View>
            </View>

            {/* Grid Stats */}
            <View style={styles.statsGrid}>
                {/* Date */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                        <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Date</Text>
                        <Text style={styles.statValue}>{formatDate(trip.date, trip.end_date)}</Text>
                    </View>
                </View>

                {/* Attending */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                        <Ionicons name="people-outline" size={18} color="#16a34a" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Attending</Text>
                        <Text style={styles.statValue}>{trip.attendingCount}</Text>
                    </View>
                </View>

                {/* Departure */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#fff7ed' }]}>
                        <Ionicons name="time-outline" size={18} color="#ea580c" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Departure</Text>
                        <Text style={styles.statValue}>{trip.departure_time ? formatTime(trip.departure_time) : 'N/A'}</Text>
                    </View>
                </View>

                {/* Return */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#f3f4f6' }]}>
                        <Ionicons name="time-outline" size={18} color="#6b7280" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Return</Text>
                        <Text style={styles.statValue}>{trip.return_time ? formatTime(trip.return_time) : 'N/A'}</Text>
                    </View>
                </View>
            </View>

            {/* Sports Event Roster (when sporting event / has sports_event_id) */}
            {(trip.sports_event_id || trip.type === 'sporting_event') && (
                <View style={styles.rosterRow}>
                    <View style={[styles.iconContainer, { backgroundColor: trip.attendingCount === 0 ? '#fef2f2' : '#f0fdf4' }]}>
                        <Ionicons name="people-outline" size={18} color={trip.attendingCount === 0 ? '#dc2626' : '#16a34a'} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.rosterLabel}>Sports Event Roster</Text>
                        <Text style={styles.rosterCount}>{trip.attendingCount} people total</Text>
                    </View>
                    <TouchableOpacity style={styles.viewRosterBtn} onPress={onManageRoster}>
                        <Text style={styles.viewRosterBtnText}>View Roster</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Footer: Event Type, Duration, Transport (match web reference) */}
            <View style={styles.cardFooter}>
                <View style={styles.footerRow}>
                    {trip.event_type ? <Text style={styles.footerText}>Event Type: {trip.event_type}</Text> : null}
                    {trip.event_length ? <Text style={[styles.footerText, styles.footerTextRight]}>Duration: {trip.event_length}</Text> : null}
                </View>
                {trip.transportation_type ? <Text style={styles.footerText}>Transport: {trip.transportation_type}</Text> : null}
                {trip.driver ? <Text style={styles.footerText}>Driver: {trip.driver}</Text> : null}
            </View>
        </View>
    );
};


export const TransportScreen = ({ navigation }: any) => {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768; // Tablet/Desktop breakpoint


    const { companyId, season } = useCompany();

    const { data: rawTrips = [], isLoading } = useTrips(companyId, season);
    const { data: rawCampers = [] } = useCampers(companyId, season);
    const { data: rawDivisions = [] } = useDivisions(companyId);

    const queryClient = useQueryClient();
    const [tripCsvUploading, setTripCsvUploading] = useState(false);
    const addTripMutation = useAddTrip();
    const updateTripMutation = useUpdateTrip();
    const manageRosterMutation = useManageTripRoster();

    /** Must be declared before any hook that reads it (was below → ReferenceError → blank screen). */
    const [modalState, setModalState] = useState<{
        visible: boolean;
        mode: 'add' | 'edit';
        tripId?: string;
    }>({ visible: false, mode: 'add' });

    const tripAttachmentTripId = modalState.visible && modalState.mode === 'edit' && modalState.tripId ? modalState.tripId : null;
    const { data: tripAttachments = [] } = useTripAttachments(tripAttachmentTripId, companyId);
    const [tripAttachmentUploading, setTripAttachmentUploading] = useState(false);

    const handleAddTripAttachment = async () => {
        if (!tripAttachmentTripId || !companyId) return;
        try {
            const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
            if (!result.assets?.[0]) return;
            const asset = result.assets[0];
            setTripAttachmentUploading(true);
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();
            const ext = asset.name?.split('.').pop() || 'bin';
            const storagePath = await uploadTripAttachment({
                companyId,
                tripId: tripAttachmentTripId,
                file: arrayBuffer,
                fileExt: ext,
            });
            const { data: { user } } = await supabase.auth.getUser();
            const { data: urlData } = supabase.storage.from('trip-attachments').getPublicUrl(storagePath);
            const { error } = await supabase.from('trip_attachments').insert({
                trip_id: tripAttachmentTripId,
                company_id: companyId,
                file_name: asset.name,
                file_url: urlData.publicUrl,
                file_type: asset.mimeType ?? null,
                uploaded_by: user?.id ?? null,
            });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['trip_attachments'] });
        } catch (e: any) {
            alert(e?.message || 'Upload failed');
        } finally {
            setTripAttachmentUploading(false);
        }
    };

    // Map fetched trips to UI expected Trips (API now returns attendingCount, event_type, etc.)
    const trips: Trip[] = React.useMemo(() => rawTrips.map(t => ({
        id: t.id || '',
        name: t.name,
        destination: t.destination || '',
        date: t.date,
        end_date: t.end_date || undefined,
        is_multi_day: !!t.is_multi_day,
        departure_time: t.departure_time || '',
        return_time: t.return_time || '',
        attendingCount: t.attendingCount ?? 0,
        chaperone: t.chaperone || '',
        status: (t.status as Trip['status']) || 'pending',
        type: t.type || 'field_trip',
        event_type: t.event_type || t.type || '',
        transportation_type: t.transportation_type || '',
        event_length: t.event_length,
        sports_event_id: t.sports_event_id,
        driver: t.driver || '',
        meal: t.meal || 'None',
    })), [rawTrips]);

    // Derived unique values for filters
    const uniqueTypes = Array.from(new Set(trips.map(t => t.type))).sort() as string[];
    const uniqueEventTypes = Array.from(new Set(trips.map(t => t.event_type))).sort() as string[];
    const uniqueTransportTypes = Array.from(new Set(trips.map(t => t.transportation_type))).sort() as string[];
    const uniqueStatuses = Array.from(new Set(trips.map(t => t.status))).sort() as string[];

    const [searchQuery, setSearchQuery] = useState('');

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [calendarCurrentDate, setCalendarCurrentDate] = useState(() => new Date());

    const selectedDateObj = useMemo(
        () => new Date(selectedDate + 'T00:00:00'),
        [selectedDate],
    );

    const calendarWidgetEvents: CalendarWidgetEvent[] = useMemo(() =>
        trips.map((trip) => ({
            id: trip.id,
            title: trip.name || trip.destination || '',
            date: new Date(trip.date + 'T00:00:00'),
            time: trip.departure_time || '',
            location: trip.destination || '',
            type: 'field-trip',
            accent: { bg: '#fef3c7', text: '#92400e', marker: '#f59e0b' },
        })),
        [trips],
    );

    // Filter State
    const [filterType, setFilterType] = useState('all');
    const [filterEventType, setFilterEventType] = useState('all');
    const [filterTransportType, setFilterTransportType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    // Modal State
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Roster Modal State and Handlers
    const [rosterModalVisible, setRosterModalVisible] = useState(false);
    const [rosterTrip, setRosterTrip] = useState<Trip | null>(null);
    const [activeRosterTab, setActiveRosterTab] = useState<'division' | 'filter'>('division');
    const [rosterFilterDivision, setRosterFilterDivision] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCamperIds, setSelectedCamperIds] = useState<Set<string>>(new Set());

    const rosterTripIdForAttendees = rosterModalVisible && rosterTrip?.id ? rosterTrip.id : null;
    const { data: existingAttendeeChildIds = [] } = useTripAttendees(rosterTripIdForAttendees);
    const lastRosterSyncKey = useRef('');

    useEffect(() => {
        if (!rosterModalVisible || !rosterTrip?.id) {
            lastRosterSyncKey.current = '';
            return;
        }
        const key = `${rosterTrip.id}:${(existingAttendeeChildIds || []).join(',')}`;
        if (lastRosterSyncKey.current === key) return;
        lastRosterSyncKey.current = key;
        setSelectedCamperIds(new Set(existingAttendeeChildIds));
    }, [rosterModalVisible, rosterTrip?.id, existingAttendeeChildIds]);

    const divisionsWithCounts = useMemo(() => {
        return (rawDivisions as any[]).map((d) => ({
            ...d,
            totalCount: rawCampers.filter((c) => camperDivisionId(c) === d.id).length,
        }));
    }, [rawDivisions, rawCampers]);

    const handleManageRoster = (trip: Trip) => {
        setRosterTrip(trip);
        setRosterModalVisible(true);
    };

    const toggleCamperSelection = (camperId: string) => {
        const newSelected = new Set(selectedCamperIds);
        if (newSelected.has(camperId)) {
            newSelected.delete(camperId);
        } else {
            newSelected.add(camperId);
        }
        setSelectedCamperIds(newSelected);
    };



    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            // Search
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                const searchable = [trip.name, trip.destination, trip.chaperone, trip.type, trip.event_type].join(' ').toLowerCase();
                if (!searchable.includes(search)) return false;
            }
            // Filters
            if (filterType !== 'all' && trip.type !== filterType) return false;
            if (filterEventType !== 'all' && trip.event_type !== filterEventType) return false;
            if (filterTransportType !== 'all' && trip.transportation_type !== filterTransportType) return false;
            if (filterStatus !== 'all' && trip.status !== filterStatus) return false;

            return true;
        }).sort((a, b) => {
            if (sortBy === 'type') return a.type.localeCompare(b.type);
            if (sortBy === 'destination') return a.destination.localeCompare(b.destination);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            // Default Date
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [trips, searchQuery, filterType, filterEventType, filterTransportType, filterStatus, sortBy]);

    // Trips for the selected date in Calendar View
    const selectedDateTrips = useMemo(() => {
        return trips.filter(t => t.date === selectedDate);
    }, [selectedDate, trips]);

    // Delete Modal State and Handlers
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        console.log('[DELETE] Starting delete for:', itemToDelete.id);
        try {
            const { error, status, statusText } = await supabase.from('trips').delete().eq('id', itemToDelete.id);
            console.log('[DELETE] Response:', { error, status, statusText });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            Alert.alert('Success', 'Trip deleted');
        } catch (err: any) {
            console.error('[DELETE] Error:', err);
            Alert.alert('Delete failed', err.message || 'Unknown error');
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmVisible(false);
            setItemToDelete(null);
        }
    };

    const openDeleteTripModal = (tripId: string) => {
        setItemToDelete({ id: tripId });
        setIsDeleteConfirmVisible(true);
    };

    const renderDeleteConfirmationModal = () => (
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
                style={styles.deleteTripModalOverlay}
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
    );


    const renderFilterModal = () => {
        if (!activeModal) return null;

        let options: string[] = [];
        let currentVal = '';
        let setVal: (val: string) => void = () => { };
        let title = '';

        switch (activeModal) {
            case 'type':
                // Match screenshot specific options (values stay snake_case for filter)
                options = ['All Types', 'field_trip', 'sporting_event', 'other'];
                currentVal = filterType === 'all' ? 'All Types' : tripTypeLabel(filterType);
                setVal = (val) => setFilterType(val === 'All Types' ? 'all' : val);
                title = 'Select Type';
                break;
            case 'eventType':
                options = ['all', ...uniqueEventTypes];
                currentVal = filterEventType;
                setVal = setFilterEventType;
                title = 'Select Event Type';
                break;
            case 'transportType':
                options = ['all', ...uniqueTransportTypes];
                currentVal = filterTransportType;
                setVal = setFilterTransportType;
                title = 'Select Transport Type';
                break;
            case 'status':
                options = ['all', ...uniqueStatuses];
                currentVal = filterStatus;
                setVal = setFilterStatus;
                title = 'Select Status';
                break;
            case 'sort':
                options = ['date', 'type', 'destination', 'status'];
                currentVal = sortBy;
                setVal = setSortBy;
                title = 'Sort By';
                break;
        }

        return (
            <Modal
                transparent
                animationType="slide"
                visible={!!activeModal}
                onRequestClose={() => setActiveModal(null)}
            >
                <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
                    <View style={styles.pickerModalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.pickerModalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.pickerTitle}>{title}</Text>
                                    <TouchableOpacity onPress={() => setActiveModal(null)}>
                                        <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {options.map((opt) => {
                                        const isTypeFilter = activeModal === 'type';
                                        const selected = isTypeFilter
                                            ? (opt === 'All Types' ? filterType === 'all' : filterType === opt)
                                            : currentVal === opt;
                                        const displayLabel = isTypeFilter && opt !== 'All Types'
                                            ? tripTypeLabel(opt)
                                            : (opt === 'all' ? `All ${title.replace('Select ', '')}s` : opt);
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={styles.pickerOption}
                                                onPress={() => {
                                                    setVal(opt);
                                                    setActiveModal(null);
                                                }}
                                            >
                                                <Text style={styles.pickerOptionText}>{displayLabel}</Text>
                                                {selected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    };

    const FilterChip = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
        <TouchableOpacity
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={onPress}
        >
            <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
            <Ionicons
                name="chevron-down"
                size={14}
                color={active ? theme.colors.text : theme.colors.textSecondary}
            />
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.topRow}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transportation</Text>
            </View>
            <Text style={styles.headerSubtitle}>Manage field trips and sporting event transportation</Text>

            {/* Toolbar Actions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbarScroll} contentContainerStyle={styles.toolbarContent}>
                {/* View Toggle */}
                <View style={styles.viewToggle}>
                    <TouchableOpacity
                        style={viewMode === 'list' ? styles.viewToggleBtnActive : styles.viewToggleBtn}
                        onPress={() => setViewMode('list')}
                    >
                        <Ionicons name="list" size={16} color={viewMode === 'list' ? "#fff" : theme.colors.text} />
                        <Text style={viewMode === 'list' ? styles.viewToggleTextActive : styles.viewToggleText}>List</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={viewMode === 'calendar' ? styles.viewToggleBtnActive : styles.viewToggleBtn}
                        onPress={() => setViewMode('calendar')}
                    >
                        <Ionicons name="calendar-outline" size={16} color={viewMode === 'calendar' ? "#fff" : theme.colors.text} />
                        <Text style={viewMode === 'calendar' ? styles.viewToggleTextActive : styles.viewToggleText}>Calendar</Text>
                    </TouchableOpacity>
                </View>

                {/* Help */}
                <TouchableOpacity style={styles.iconButton} onPress={() => setShowHelpModal(true)}>
                    <Ionicons name="help-circle-outline" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {/* Upload CSV */}
                <TouchableOpacity
                    style={[styles.actionButtonSecondary, tripCsvUploading && { opacity: 0.65 }]}
                    disabled={tripCsvUploading}
                    onPress={async () => {
                        if (!companyId || !season) {
                            Alert.alert('Missing context', 'Company or season is not available yet.');
                            return;
                        }
                        const picked = await pickAndReadCsvText();
                        if (!picked.ok) {
                            if (picked.error === 'canceled') return;
                            Alert.alert('CSV', picked.message || 'Could not read file.');
                            return;
                        }
                        setTripCsvUploading(true);
                        try {
                            const result = await uploadCsvFromText('trips', picked.text, { companyId, season });
                            if (result.ok) {
                                await queryClient.invalidateQueries({ queryKey: ['trips', companyId, season] });
                                Alert.alert('Success', result.message);
                            } else {
                                Alert.alert('Upload failed', result.error);
                            }
                        } finally {
                            setTripCsvUploading(false);
                        }
                    }}
                >
                    <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.text} />
                    <Text style={styles.actionButtonTextSecondary}>{tripCsvUploading ? 'Uploading…' : 'Upload CSV'}</Text>
                </TouchableOpacity>

                {/* Add Trip */}
                <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleAddTrip}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.actionButtonTextPrimary}>Add Trip</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            {/* Horizontal Filter Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
                <FilterChip
                    label={filterType === 'all' ? 'All Types' : tripTypeLabel(filterType)}
                    active={filterType !== 'all'}
                    onPress={() => setActiveModal('type')}
                />
                <FilterChip
                    label={filterEventType === 'all' ? 'All Event Types' : filterEventType}
                    active={filterEventType !== 'all'}
                    onPress={() => setActiveModal('eventType')}
                />
                <FilterChip
                    label={filterTransportType === 'all' ? 'All Transport...' : filterTransportType}
                    active={filterTransportType !== 'all'}
                    onPress={() => setActiveModal('transportType')}
                />
                <FilterChip
                    label={filterStatus === 'all' ? 'All Statuses' : filterStatus}
                    active={filterStatus !== 'all'}
                    onPress={() => setActiveModal('status')}
                />
                <FilterChip
                    label={`Sort by ${sortBy}`}
                    active={sortBy !== 'date'}
                    onPress={() => setActiveModal('sort')}
                />
                {(filterType !== 'all' || filterEventType !== 'all' || filterTransportType !== 'all' || filterStatus !== 'all' || searchQuery !== '') && (
                    <TouchableOpacity
                        style={styles.clearFiltersBtn}
                        onPress={() => {
                            setFilterType('all');
                            setFilterEventType('all');
                            setFilterTransportType('all');
                            setFilterStatus('all');
                            setSearchQuery('');
                            setSortBy('date');
                        }}
                    >
                        <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.clearFiltersText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );

    const renderCalendarView = () => {
        const selectedDateDisplay = new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const tripList = (
            selectedDateTrips.length === 0 ? (
                <Text style={styles.noEventsText}>No trips scheduled for this date</Text>
            ) : (
                <View style={{ gap: 12 }}>
                    {selectedDateTrips.map(trip => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            onDelete={() => openDeleteTripModal(trip.id)}
                            onEdit={() => handleEditTrip(trip)}
                            onManageRoster={() => handleManageRoster(trip)}
                        />
                    ))}
                </View>
            )
        );

        if (isLargeScreen) {
            return (
                <ScrollView contentContainerStyle={[styles.calendarViewContent, { flexDirection: 'row', gap: 24 }]}>
                    <View style={{ flex: 1, maxWidth: 400 }}>
                        <UnifiedCalendar
                            events={calendarWidgetEvents}
                            currentDate={calendarCurrentDate}
                            onCurrentDateChange={setCalendarCurrentDate}
                            selectedDate={selectedDateObj}
                            onSelectedDateChange={(d) => setSelectedDate(d.toISOString().split('T')[0])}
                            views={['Month', 'Week', 'Day', 'Agenda']}
                            showZoom={true}
                            showNavigation={true}
                        />
                    </View>
                    <View style={{ flex: 2 }}>
                        <Text style={[styles.selectedDateTitle, { fontSize: 24, marginBottom: 24 }]}>{selectedDateDisplay}</Text>
                        {tripList}
                    </View>
                </ScrollView>
            );
        }

        // Mobile Layout: Date Title -> Calendar -> Trips
        return (
            <ScrollView contentContainerStyle={styles.calendarViewContent}>
                <Text style={[styles.selectedDateTitle, { marginLeft: 4 }]}>
                    {selectedDateDisplay}
                </Text>

                <UnifiedCalendar
                    events={calendarWidgetEvents}
                    currentDate={calendarCurrentDate}
                    onCurrentDateChange={setCalendarCurrentDate}
                    selectedDate={selectedDateObj}
                    onSelectedDateChange={(d) => setSelectedDate(d.toISOString().split('T')[0])}
                    views={['Month', 'Week', 'Day', 'Agenda']}
                    showZoom={true}
                    showNavigation={true}
                />

                <View style={styles.selectedDateContainer}>
                    {tripList}
                </View>
            </ScrollView>
        );
    };

    // Help Modal State
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [activeHelpTab, setActiveHelpTab] = useState('Staff');

    const helpTabs = ['Children', 'Staff', 'Medications', 'Trips', 'Menu', 'Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'];

    const renderHelpModal = () => (
        <Modal
            transparent
            animationType="fade"
            visible={showHelpModal}
            onRequestClose={() => setShowHelpModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.helpModalContent, isLargeScreen && styles.helpModalContentLarge]}>
                    <View style={styles.helpModalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.text} />
                            <Text style={styles.helpModalTitle}>CSV Upload Format Guide</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.helpModalBody} showsVerticalScrollIndicator={false}>
                        {/* Tabs */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.helpTabsScrollContent}
                            style={styles.helpTabsScroll}
                        >
                            {helpTabs.map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.helpTab, activeHelpTab === tab && styles.helpTabActive]}
                                    onPress={() => setActiveHelpTab(tab)}
                                >
                                    <Text style={[styles.helpTabText, activeHelpTab === tab && styles.helpTabTextActive]}>{tab}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Content */}
                        <View style={styles.helpContent}>
                            <Text style={styles.contentTitle}>Staff Directory</Text>
                            <Text style={styles.contentSubtitle}>CSV format for staff directory upload</Text>

                            <Text style={styles.sectionLabel}>Required Columns (first row):</Text>
                            <View style={styles.codeBlock}>
                                <Text style={styles.codeText}>name, email, phone, role, department, hire_date, leader_id, status, season</Text>
                            </View>

                            <Text style={styles.sectionLabel}>Example Data Row:</Text>
                            <View style={styles.codeBlock}>
                                <Text style={styles.codeText}>Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, &lt;leader_id&gt;, active, Summer 2024</Text>
                            </View>

                            <View style={styles.infoBox}>
                                <Text style={styles.infoBoxText}>
                                    <Text style={{ fontWeight: 'bold' }}>Important Notes:</Text> leader_id must be a valid UUID from staff table. hire_date format: YYYY-MM-DD
                                </Text>
                            </View>

                            <View style={styles.tipsBox}>
                                <Text style={styles.tipsTitle}>General Tips:</Text>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• First row must contain column names exactly as shown</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Use commas to separate values</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Leave fields empty for optional columns</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Maximum 1000 rows per upload</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Dates must be in YYYY-MM-DD format</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• UUIDs can be obtained from the backend for existing records</Text></View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const initialTripData: Trip = {
        id: '',
        name: '',
        destination: '',
        date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_multi_day: false,
        departure_time: '',
        return_time: '',
        attendingCount: 0,
        chaperone: '',
        status: 'pending',
        type: 'field_trip',
        event_type: '',
        transportation_type: 'None',
        driver: '',
        meal: 'None',
        event_length: '',
        capacity: '',
        location_type: 'AWAY',
        sports_event_id: null,
    };

    const [tripFormData, setTripFormData] = useState<Trip>(initialTripData);

    const handleEditTrip = (trip: Trip) => {
        setTripFormData({
            ...trip,
            departure_time: db24hToPickerTime(trip.departure_time) || trip.departure_time || '',
            return_time: db24hToPickerTime(trip.return_time) || trip.return_time || '',
            transportation_type: transportDbToDisplay(trip.transportation_type),
        });
        setModalState({ visible: true, mode: 'edit', tripId: trip.id });
    };

    const handleAddTrip = () => {
        setTripFormData({ ...initialTripData, date: new Date().toISOString().split('T')[0] });
        setModalState({ visible: true, mode: 'add' });
    };

    const handleSaveTrip = () => {
        if (!companyId) {
            Alert.alert('Error', 'No company selected.');
            return;
        }
        if (!tripFormData.name?.trim()) {
            Alert.alert('Validation', 'Please enter a trip title.');
            return;
        }

        const dep = pickerTimeToDb24h(tripFormData.departure_time);
        const ret = pickerTimeToDb24h(tripFormData.return_time);

        const payload: Record<string, unknown> = {
            company_id: companyId,
            season,
            name: tripFormData.name.trim(),
            type: normalizeTripTypeForDb(tripFormData.type),
            destination: tripFormData.destination?.trim() || null,
            date: tripFormData.date,
            end_date: tripFormData.is_multi_day && tripFormData.end_date ? tripFormData.end_date : null,
            is_multi_day: tripFormData.is_multi_day,
            departure_time: dep,
            return_time: ret,
            chaperone: tripFormData.chaperone?.trim() || null,
            capacity: parseInt(tripFormData.capacity || '0', 10) || null,
            status: tripFormData.status || 'pending',
            event_type: tripFormData.event_type?.trim() || null,
            event_length: tripFormData.event_length?.trim() || null,
            transportation_type: transportDisplayToDb(tripFormData.transportation_type || ''),
            driver: tripFormData.driver?.trim() || null,
            meal: tripFormData.meal && tripFormData.meal !== 'None' ? tripFormData.meal : null,
        };

        if (modalState.mode === 'edit' && modalState.tripId) {
            payload.sports_event_id = tripFormData.sports_event_id ?? null;
        }

        const onErr = (e: any) => Alert.alert('Could not save trip', e?.message || 'Unknown error');

        if (modalState.mode === 'add') {
            addTripMutation.mutate(payload as any, {
                onSuccess: () => setModalState((s) => ({ ...s, visible: false })),
                onError: onErr,
            });
        } else if (modalState.mode === 'edit' && modalState.tripId) {
            updateTripMutation.mutate({ ...(payload as any), id: modalState.tripId }, {
                onSuccess: () => setModalState((s) => ({ ...s, visible: false })),
                onError: onErr,
            });
        }
    };

    // Picker State
    const [activePicker, setActivePicker] = useState<'startDate' | 'endDate' | 'departureTime' | 'returnTime' | 'type' | 'locationType' | 'status' | 'transportation_type' | 'meal' | null>(null);
    const [pickerCalendarDate, setPickerCalendarDate] = useState(() => new Date());

    useEffect(() => {
        if (activePicker === 'startDate') {
            setPickerCalendarDate(new Date(tripFormData.date + 'T00:00:00'));
        } else if (activePicker === 'endDate') {
            const d = tripFormData.end_date || tripFormData.date;
            setPickerCalendarDate(new Date(d + 'T00:00:00'));
        }
    }, [activePicker]);

    const handlePickerSelect = (value: string) => {
        if (!activePicker) return;

        if (activePicker === 'type') {
            setTripFormData({ ...tripFormData, type: value });
        } else if (activePicker === 'startDate') {
            setTripFormData({ ...tripFormData, date: value });
        } else if (activePicker === 'endDate') {
            setTripFormData({ ...tripFormData, end_date: value });
        } else if (activePicker === 'departureTime') {
            setTripFormData({ ...tripFormData, departure_time: value });
        } else if (activePicker === 'returnTime') {
            setTripFormData({ ...tripFormData, return_time: value });
        } else if (activePicker === 'status') {
            setTripFormData({ ...tripFormData, status: value as any });
        } else if (activePicker === 'transportation_type') {
            setTripFormData({ ...tripFormData, transportation_type: value });
        } else if (activePicker === 'meal') {
            setTripFormData({ ...tripFormData, meal: value });
        }
        setActivePicker(null);
    };

    const renderActionSheet = (title: string, options: string[], currentValue: string | undefined, displayModifier?: (val: string) => React.ReactNode, onSelect?: (val: string) => void) => (
        <View style={{ padding: 16 }}>
            <Text style={styles.pickerTitle}>{title}</Text>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    style={styles.pickerOption}
                    onPress={() => onSelect ? onSelect(opt) : handlePickerSelect(opt)}
                >
                    <Text style={styles.pickerOptionText}>{displayModifier ? displayModifier(opt) : opt}</Text>
                    {currentValue === opt && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setActivePicker(null)}>
                <Text style={styles.closePickerText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPickerModalContent = () => {
        if (!activePicker) return null;

        if (activePicker === 'startDate' || activePicker === 'endDate') {
            const currentSelected = activePicker === 'startDate' ? tripFormData.date : (tripFormData.end_date || tripFormData.date);
            return (
                <View style={{ padding: 16 }}>
                    <Text style={styles.pickerTitle}>Select {activePicker === 'startDate' ? 'Start' : 'End'} Date</Text>
                    <UnifiedCalendar
                        events={[]}
                        currentDate={pickerCalendarDate}
                        onCurrentDateChange={setPickerCalendarDate}
                        selectedDate={new Date(currentSelected + 'T00:00:00')}
                        onSelectedDateChange={(d) => handlePickerSelect(d.toISOString().split('T')[0])}
                        views={['Month']}
                        showZoom={false}
                        showNavigation={true}
                    />
                    <TouchableOpacity style={styles.closePickerBtn} onPress={() => setActivePicker(null)}>
                        <Text style={styles.closePickerText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activePicker === 'departureTime' || activePicker === 'returnTime') {
            // Generate time slots (every 30 mins for demo)
            const times = [];
            for (let i = 6; i < 22; i++) {
                const hour = i % 12 || 12;
                const ampm = i < 12 ? 'AM' : 'PM';
                times.push(`${hour}:00 ${ampm}`);
                times.push(`${hour}:30 ${ampm}`);
            }

            return (
                <View style={{ padding: 16, maxHeight: 400 }}>
                    <Text style={styles.pickerTitle}>Select Time</Text>
                    <ScrollView style={{ maxHeight: 300 }}>
                        {times.map(time => (
                            <TouchableOpacity
                                key={time}
                                style={styles.pickerOption}
                                onPress={() => handlePickerSelect(time)}
                            >
                                <Text style={styles.pickerOptionText}>{time}</Text>
                                {((activePicker === 'departureTime' && tripFormData.departure_time === time) ||
                                    (activePicker === 'returnTime' && tripFormData.return_time === time)) &&
                                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                }
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.closePickerBtn} onPress={() => setActivePicker(null)}>
                        <Text style={styles.closePickerText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activePicker === 'type') {
            const typeOptions = [
                { label: 'Field Trip', value: 'field_trip' },
                { label: 'Sporting Event', value: 'sporting_event' },
                { label: 'Staff Bus', value: 'staff_bus' },
                { label: 'Other', value: 'other' }
            ];
            return renderActionSheet(
                'Select Type',
                typeOptions.map(t => t.label),
                typeOptions.find(t => t.value === tripFormData.type)?.label || tripFormData.type,
                undefined,
                (label) => {
                    const val = typeOptions.find(t => t.label === label)?.value || label;
                    setTripFormData({ ...tripFormData, type: val });
                    setActivePicker(null);
                }
            );
        }

        if (activePicker === 'locationType') {
            return renderActionSheet('Select Location Type', ['AWAY', 'ON SITE'], tripFormData.location_type || 'AWAY', undefined, (val) => {
                setTripFormData({ ...tripFormData, location_type: val });
                setActivePicker(null);
            });
        }

        if (activePicker === 'status') {
            return renderActionSheet('Select Status', ['pending', 'approved', 'confirmed'], tripFormData.status, (status) => <StatusBadge status={status as any} />);
        }

        if (activePicker === 'transportation_type') {
            return renderActionSheet('Select Transportation', ['Bus', 'Van', 'None'], tripFormData.transportation_type);
        }

        if (activePicker === 'meal') {
            return renderActionSheet('Select Meal', ['None', 'Packed Lunch', 'Cafeteria', 'Restaurant'], tripFormData.meal);
        }
    };


    const renderPickerModal = () => (
        <ModalPickerOverlay
            visible={!!activePicker}
            onClose={() => setActivePicker(null)}
            title="Select Value"
        >
            <View style={styles.pickerModalContent}>
                {renderPickerModalContent()}
            </View>
        </ModalPickerOverlay>
    );

    const renderTripFormModal = () => (
        <Modal
            transparent
            animationType="slide"
            visible={modalState.visible}
            onRequestClose={() => setModalState({ ...modalState, visible: false })}
        >
            <View style={styles.tripFormModalOverlay}>
                <View style={styles.tripFormModalContent}>
                    <View style={styles.tripFormModalHeader}>
                        <Text style={styles.tripFormModalTitle} numberOfLines={1}>{modalState.mode === 'add' ? 'New Activity/Field Trip' : 'Edit Activity/Field Trip'}</Text>
                        <TouchableOpacity onPress={() => setModalState({ ...modalState, visible: false })} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.tripFormModalBody} contentContainerStyle={styles.tripFormScrollContent} showsVerticalScrollIndicator={false}>

                        {/* Multi-Day Toggle - Top as per screenshot */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <MaterialCommunityIcons name="calendar-range" size={20} color={theme.colors.text} />
                                    <Text style={styles.toggleLabel}>Multi-Day Event</Text>
                                </View>
                                <Text style={styles.toggleHelper}>Enable this for events spanning multiple days</Text>
                            </View>
                            <Switch
                                value={tripFormData.is_multi_day}
                                onValueChange={(val) => setTripFormData({ ...tripFormData, is_multi_day: val })}
                                trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                                thumbColor="#ffffff"
                                // @ts-ignore
                                activeThumbColor="#ffffff"
                                ios_backgroundColor="#e2e8f0"
                            />
                        </View>

                        {/* Dates Row */}
                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Start Date</Text>
                                <TouchableOpacity style={styles.dateInputContainer} onPress={() => setActivePicker('startDate')}>
                                    <Text style={styles.dateInputText}>{tripFormData.date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>End Date</Text>
                                <TouchableOpacity
                                    style={[styles.dateInputContainer, !tripFormData.is_multi_day && { backgroundColor: theme.colors.background }]}
                                    onPress={() => tripFormData.is_multi_day && setActivePicker('endDate')}
                                    disabled={!tripFormData.is_multi_day}
                                >
                                    <Text style={[styles.dateInputText, !tripFormData.is_multi_day && { color: theme.colors.textSecondary }]}>
                                        {tripFormData.is_multi_day ? (tripFormData.end_date || 'mm/dd/yyyy') : 'mm/dd/yyyy'}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={!tripFormData.is_multi_day ? theme.colors.textSecondary : theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {tripFormData.is_multi_day ? (
                            <View style={styles.selectedBadge}>
                                <Text style={styles.selectedBadgeText}>
                                    {multiDayLabel(tripFormData.date, tripFormData.end_date || tripFormData.date) || 'Multi-day trip'}
                                </Text>
                            </View>
                        ) : null}

                        {/* Title */}
                        <View style={[styles.formGroup, { marginTop: 16 }]}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Junior Hershey/Dorney Trip"
                                value={tripFormData.name}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, name: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Destination</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="City or venue"
                                value={tripFormData.destination}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, destination: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Chaperone</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Name or N/A"
                                value={tripFormData.chaperone}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, chaperone: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        {/* Activity Type */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Activity Type</Text>
                            <TouchableOpacity style={styles.typeSelector} onPress={() => setActivePicker('type')}>
                                <Text style={styles.typeSelectorText}>{tripTypeLabel(tripFormData.type)}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Event type (e.g. Football, field-trip)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Football"
                                value={tripFormData.event_type}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, event_type: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Duration (e.g. tournament)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="tournament"
                                value={tripFormData.event_length || ''}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, event_length: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Transportation</Text>
                            <TouchableOpacity style={styles.typeSelector} onPress={() => setActivePicker('transportation_type')}>
                                <Text style={styles.typeSelectorText}>{tripFormData.transportation_type || 'None'}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Driver / vehicle notes</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Rented, staff driver, etc."
                                value={tripFormData.driver || ''}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, driver: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Capacity</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Optional max seats"
                                keyboardType="number-pad"
                                value={tripFormData.capacity || ''}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, capacity: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Departure</Text>
                                <TouchableOpacity style={styles.dateInputContainer} onPress={() => setActivePicker('departureTime')}>
                                    <Text style={styles.dateInputText}>{tripFormData.departure_time || 'Select time'}</Text>
                                    <Ionicons name="time-outline" size={20} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Return</Text>
                                <TouchableOpacity style={styles.dateInputContainer} onPress={() => setActivePicker('returnTime')}>
                                    <Text style={styles.dateInputText}>{tripFormData.return_time || 'Select time'}</Text>
                                    <Ionicons name="time-outline" size={20} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Status</Text>
                            <TouchableOpacity style={styles.typeSelector} onPress={() => setActivePicker('status')}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <StatusBadge status={tripFormData.status} />
                                </View>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Meal</Text>
                            <TouchableOpacity style={styles.typeSelector} onPress={() => setActivePicker('meal')}>
                                <Text style={styles.typeSelectorText}>{tripFormData.meal || 'None'}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Location Type (New Field) */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Location Type</Text>
                            <TouchableOpacity style={styles.typeSelector} onPress={() => setActivePicker('locationType')}>
                                <Text style={styles.typeSelectorText}>{tripFormData.location_type || 'AWAY'}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Divisions (Select Multiple) */}
                        <View style={styles.formGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={[styles.label, { marginBottom: 0 }]}>Divisions (select multiple)</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        style={styles.actionButtonSecondary}
                                        onPress={() =>
                                            Alert.alert('Divisions', 'Division assignment for trips is managed on the web app. Trip roster below still works for attendee lists.')
                                        }
                                    >
                                        <Text style={styles.actionButtonTextSecondary}>Select All</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButtonSecondary}
                                        onPress={() =>
                                            Alert.alert('Divisions', 'Division assignment for trips is managed on the web app.')
                                        }
                                    >
                                        <Text style={styles.actionButtonTextSecondary}>Deselect All</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Trip Attachments (edit only) */}
                        {modalState.mode === 'edit' && modalState.tripId && (
                            <View style={[styles.formGroup, { marginTop: 16 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={styles.label}>Attachments</Text>
                                    <TouchableOpacity
                                        style={[styles.actionButtonSecondary, tripAttachmentUploading && { opacity: 0.7 }]}
                                        onPress={handleAddTripAttachment}
                                        disabled={tripAttachmentUploading}
                                    >
                                        <Ionicons name="attach-outline" size={16} color={theme.colors.text} />
                                        <Text style={styles.actionButtonTextSecondary}>{tripAttachmentUploading ? 'Uploading…' : 'Add file'}</Text>
                                    </TouchableOpacity>
                                </View>
                                {tripAttachments.length === 0 ? (
                                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>No files attached</Text>
                                ) : (
                                    tripAttachments.map((att: any) => (
                                        <View key={att.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                            <Text style={{ flex: 1, fontSize: 14, color: theme.colors.text }} numberOfLines={1}>{att.file_name}</Text>
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    const path = pathFromFileUrl(att.file_url, 'trip-attachments');
                                                    if (path) {
                                                        try {
                                                            const url = await getSignedUrl('tripAttachments', path);
                                                            Linking.openURL(url);
                                                        } catch (_) {}
                                                    }
                                                }}
                                            >
                                                <Text style={{ fontSize: 14, color: theme.colors.primary }}>View</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}

                        {/* Footer Buttons */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setModalState({ ...modalState, visible: false })}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitButton} onPress={handleSaveTrip}>
                                <Text style={styles.submitButtonText}>{modalState.mode === 'add' ? 'Add Trip' : 'Save Changes'}</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </View>
                {renderPickerModal()}
            </View>
        </Modal>
    );

    const renderRosterModal = () => {
        // Calculate allergy counts
        const selectedCampersList = rawCampers.filter(c => selectedCamperIds.has(c.id));
        const allergyCount = selectedCampersList.filter(c => c.allergies).length;

        return (
            <Modal
                transparent
                animationType="slide"
                visible={rosterModalVisible}
                onRequestClose={() => setRosterModalVisible(false)}
            >
                <View style={styles.rosterModalOverlay}>
                    <View style={styles.rosterModalContent}>
                        <View style={styles.rosterModalHeader}>
                            <Text style={styles.rosterModalTitle} numberOfLines={2}>Manage Roster for {rosterTrip?.name}</Text>
                            <TouchableOpacity onPress={() => setRosterModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rosterTabsContainer}>
                            <TouchableOpacity
                                style={[styles.rosterTab, activeRosterTab === 'division' && styles.rosterTabActive]}
                                onPress={() => setActiveRosterTab('division')}
                            >
                                <Text style={[styles.rosterTabText, activeRosterTab === 'division' && styles.rosterTabTextActive]}>By Division</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.rosterTab, activeRosterTab === 'filter' && styles.rosterTabActive]}
                                onPress={() => setActiveRosterTab('filter')}
                            >
                                <Text style={[styles.rosterTabText, activeRosterTab === 'filter' && styles.rosterTabTextActive]}>Filter</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.helpModalBody} showsVerticalScrollIndicator={false}>
                            {activeRosterTab === 'division' ? (
                                divisionsWithCounts.map(division => {
                                    const divisionCampers = rawCampers.filter((c) => camperDivisionId(c) === division.id);
                                    const divisionSelectedCount = divisionCampers.filter(c => selectedCamperIds.has(c.id)).length;

                                    return (
                                        <View key={division.id} style={styles.divisionSection}>
                                            <View style={styles.divisionHeader}>
                                                <Text style={styles.divisionTitle}>{division.name}</Text>
                                                <Text style={styles.divisionCount}>{divisionSelectedCount} / {division.totalCount}</Text>
                                            </View>
                                            <View style={styles.camperList}>
                                                {divisionCampers.map(camper => (
                                                    <TouchableOpacity
                                                        key={camper.id}
                                                        style={[
                                                            styles.camperItem,
                                                            selectedCamperIds.has(camper.id) && styles.camperItemSelected
                                                        ]}
                                                        onPress={() => toggleCamperSelection(camper.id)}
                                                    >
                                                        <View style={[styles.radioCircle, selectedCamperIds.has(camper.id) && styles.radioCircleSelected]}>
                                                            {selectedCamperIds.has(camper.id) && <View style={styles.radioInnerCircle} />}
                                                        </View>
                                                        <Text style={styles.camperName}>{camper.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )
                                })
                            ) : (
                                <View>
                                    <Text style={styles.filterLabel}>Filter by Division</Text>
                                    <TouchableOpacity
                                        style={styles.filterDropdown}
                                        onPress={() => setIsDropdownOpen(true)}
                                    >
                                        <Text style={styles.filterDropdownText}>
                                            {rosterFilterDivision === 'all' ? 'All Divisions' : rawDivisions.find(d => d.id === rosterFilterDivision)?.name}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>

                                    <View style={styles.selectedHeader}>
                                        <Text style={styles.selectedLabel}>Selected Campers</Text>
                                        <View style={styles.selectedBadge}>
                                            <Text style={styles.selectedBadgeText}>{selectedCamperIds.size} selected</Text>
                                        </View>
                                    </View>

                                    <View style={styles.camperList}>
                                        {rawCampers
                                            .filter((c) => rosterFilterDivision === 'all' || camperDivisionId(c) === rosterFilterDivision)
                                            .map(camper => {
                                                const divId = camperDivisionId(camper);
                                                const divisionName = rawDivisions.find(d => d.id === divId)?.name;
                                                return (
                                                    <TouchableOpacity
                                                        key={camper.id}
                                                        style={[
                                                            styles.camperItem,
                                                            selectedCamperIds.has(camper.id) && styles.camperItemSelected
                                                        ]}
                                                        onPress={() => toggleCamperSelection(camper.id)}
                                                    >
                                                        <View style={[styles.radioCircle, selectedCamperIds.has(camper.id) && styles.radioCircleSelected]}>
                                                            {selectedCamperIds.has(camper.id) && <View style={styles.radioInnerCircle} />}
                                                        </View>
                                                        <Text style={styles.camperName}>
                                                            {camper.name} <Text style={{ color: theme.colors.textSecondary }}>- {divisionName}</Text>
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.rosterFooter}>
                            <Text style={styles.rosterFooterText}>Total selected: {selectedCamperIds.size} campers</Text>
                            <View style={styles.rosterFooterButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setRosterModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitButton, manageRosterMutation.isPending && { opacity: 0.7 }]}
                                    disabled={manageRosterMutation.isPending}
                                    onPress={async () => {
                                        if (!rosterTrip?.id || !companyId) {
                                            Alert.alert('Roster', 'Missing trip or company.');
                                            return;
                                        }
                                        try {
                                            await manageRosterMutation.mutateAsync({
                                                tripId: rosterTrip.id,
                                                childIds: Array.from(selectedCamperIds),
                                                companyId,
                                            });
                                            setRosterModalVisible(false);
                                        } catch (e: any) {
                                            Alert.alert('Roster', e?.message || 'Failed to save roster');
                                        }
                                    }}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {manageRosterMutation.isPending ? 'Saving…' : 'Save Roster'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </View>
            </Modal>
        );
    };

    const renderDivisionFilterModal = () => (
        <Modal
            transparent
            animationType="slide"
            visible={isDropdownOpen}
            onRequestClose={() => setIsDropdownOpen(false)}
        >
            <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
                <View style={styles.pickerModalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.pickerModalContent}>
                            <Text style={styles.pickerTitle}>Select Division</Text>
                            <ScrollView style={{ maxHeight: 400 }}>
                                <TouchableOpacity
                                    style={[styles.pickerOption, rosterFilterDivision === 'all' && styles.modalOptionActive]}
                                    onPress={() => {
                                        setRosterFilterDivision('all');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    <Text style={[styles.pickerOptionText, rosterFilterDivision === 'all' && styles.modalOptionTextActive]}>All Divisions</Text>
                                    {rosterFilterDivision === 'all' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                                </TouchableOpacity>
                                {rawDivisions.map(division => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[styles.pickerOption, rosterFilterDivision === division.id && styles.modalOptionActive]}
                                        onPress={() => {
                                            setRosterFilterDivision(division.id);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={[styles.pickerOptionText, rosterFilterDivision === division.id && styles.modalOptionTextActive]}>{division.name}</Text>
                                        {rosterFilterDivision === division.id && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setIsDropdownOpen(false)}>
                                <Text style={styles.closePickerText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {renderDeleteConfirmationModal()}
            {renderFilterModal()}
            {renderHelpModal()}
            {renderTripFormModal()}
            {renderRosterModal()}
            {renderDivisionFilterModal()}
            {renderHeader()}
            {isLoading && companyId ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                    <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading trips…</Text>
                </View>
            ) : viewMode === 'list' ? (
                <FlatList
                    data={filteredTrips}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TripCard
                            trip={item}
                            onDelete={() => openDeleteTripModal(item.id)}
                            onEdit={() => handleEditTrip(item)}
                            onManageRoster={() => handleManageRoster(item)}
                        />
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                {!companyId ? 'Select a company to load trips.' : 'No trips found matching your filters.'}
                            </Text>
                        </View>
                    }
                />
            ) : (
                renderCalendarView()
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    listContent: {
        paddingBottom: theme.spacing.xl,
    },
    headerContainer: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs,
    },
    menuButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    addButton: {
        backgroundColor: theme.colors.secondary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        marginLeft: theme.spacing.xs,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        height: '100%',
    },
    filterScroll: {
        marginBottom: theme.spacing.xs,
    },
    filterContent: {
        paddingVertical: 4,
        gap: 8,
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 4,
    },
    filterChipActive: {
        backgroundColor: '#eff6ff', // light blue tint
        borderColor: theme.colors.secondary,
    },
    filterText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    filterTextActive: {
        fontSize: 13,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    clearFiltersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
    },
    clearFiltersText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    emptyState: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    // Modal Styles
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: theme.spacing.lg,
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        maxHeight: 400,
        ...theme.shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalOption: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalOptionActive: {
        backgroundColor: '#eff6ff',
        borderRadius: theme.borderRadius.sm,
    },
    modalOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    modalOptionTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    // Card Styles
    card: {
        backgroundColor: '#FFF8F5', // Light beige/pink background
        marginHorizontal: theme.spacing.md,
        // marginBottom removed in favor of ItemSeparatorComponent
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.card,
        borderLeftWidth: 4,
        padding: theme.spacing.md,
    },
    cardBorderRed: {
        borderLeftColor: theme.colors.danger,
        backgroundColor: '#FFF8F5', // Light beige/pink background
    },
    cardBorderGreen: {
        borderLeftColor: theme.colors.success,
        backgroundColor: '#FFF8F5',
    },
    cardBgGreen: {
        backgroundColor: '#f0fdf4', // Light green when confirmed/approved (match web reference)
    },
    cardHeader: {
        marginBottom: theme.spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    manageBtn: {
        backgroundColor: '#f97316', // Orange
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBtn: {
        padding: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    typeBadge: {
        backgroundColor: '#e0f2fe', // light blue
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeBadgeText: {
        fontSize: 12,
        color: '#0284c7', // dark blue
        fontWeight: '500',
    },
    durationBadge: {
        backgroundColor: '#0ea5e9', // bright blue
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    durationBadgeText: {
        fontSize: 11,
        color: '#ffffff',
        fontWeight: '600',
    },
    destinationText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    chaperoneText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12, // Reduced gap slightly
        marginBottom: theme.spacing.md,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flexBasis: '45%', // base width but allows growing/shrinking if needed
        flexGrow: 1,
        minWidth: 140, // Ensure it doesn't get too small
        gap: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11, // Slightly smaller label
        color: theme.colors.textSecondary,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        flexShrink: 1, // Allow text to wrap if very long
    },

    // Roster Modal Styles
    rosterTabsContainer: {
        flexDirection: 'row',
        padding: 4,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        margin: theme.spacing.md,
    },
    rosterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    rosterTabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    rosterTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    rosterTabTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    divisionSection: {
        marginBottom: 16,
    },
    divisionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    divisionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    divisionCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    camperList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
    },
    camperItem: {
        width: '50%', // 2 columns
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        paddingRight: 8,
        paddingLeft: 4,
        gap: 8,
        borderRadius: 6,
    },
    camperItemSelected: {
        backgroundColor: '#f0fdf4',
    },
    camperName: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    radioCircleSelected: {
        borderColor: theme.colors.primary,
    },
    radioInnerCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
    },
    rosterFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rosterFooterText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    rosterFooterButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    // Roster Modal Bottom Sheet Styles
    rosterModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    rosterModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        width: '100%',
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    rosterModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 12,
    },
    rosterModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        flexWrap: 'wrap',
    },
    closeButton: {
        padding: 4,
        marginTop: -4,
    },
    // Trip Form Modal Bottom Sheet Styles
    tripFormModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    tripFormModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    tripFormModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 12,
    },
    tripFormModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
    },
    tripFormModalBody: {
        // removed flex: 1 to prevent collapse on mobile
    },
    tripFormScrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    filterContentPlaceholder: {
        padding: 20,
        alignItems: 'center',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        marginLeft: 16,
        color: theme.colors.text,
    },
    filterDropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    filterDropdownText: {
        fontSize: 15,
        color: theme.colors.text,
    },
    selectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    selectedLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    selectedBadge: {
        backgroundColor: '#0044CC',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    selectedBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Dropdown Styles
    dropdownListContainer: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 250,
        ...theme.shadows.card,
        zIndex: 2000, // Ensure it sits above everything
    },
    dropdownList: {
        // removed flex: 1 to prevent collapse on mobile
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    dropdownItemActive: {
        backgroundColor: '#2563eb', // Blue selection
    },
    dropdownItemText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownItemTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    camperDivisionName: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: theme.spacing.sm,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 2,
    },
    footerText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    footerTextRight: {
        marginLeft: 'auto',
    },
    rosterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    rosterLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    rosterCount: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    viewRosterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    viewRosterBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
    },
    // Toolbar Styles
    toolbarScroll: {
        marginBottom: theme.spacing.sm,
    },
    toolbarContent: {
        paddingHorizontal: 4,
        gap: 8,
        alignItems: 'center',
        paddingBottom: 4,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    viewToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: theme.colors.surface,
    },
    viewToggleBtnActive: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: '#2563eb', // Blue
    },
    viewToggleText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    viewToggleTextActive: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    iconButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    actionButtonTextSecondary: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    actionButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: '#2563eb', // Blue
        borderRadius: theme.borderRadius.md,
    },
    actionButtonTextPrimary: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    // Calendar Styles
    calendarViewContent: {
        padding: theme.spacing.md,
    },
    selectedDateContainer: {
        paddingHorizontal: 4,
    },
    selectedDateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    noEventsText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
        fontSize: 14,
    },
    // Help Modal Styles
    helpModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        width: '100%',
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    helpModalContentLarge: {
        width: '60%',
        alignSelf: 'center',
        maxHeight: '80%',
    },
    helpModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    helpModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    helpModalBody: {
    },
    helpTabsScroll: {
        marginBottom: theme.spacing.md,
    },
    helpTabsScrollContent: {
        gap: 8,
        paddingHorizontal: 4, // Add a little padding for potential shadows
        paddingBottom: 4,
    },
    helpTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    helpTabActive: {
        backgroundColor: '#fff',
        borderColor: 'transparent',
        borderBottomWidth: 0,
        borderRadius: 16,
        ...theme.shadows.card, // Fallback to card shadow since sm might not exist
    },
    helpTabText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    helpTabTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    helpContent: {
        marginTop: 8,
    },
    contentTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    contentSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
        marginBottom: 8,
    },
    codeBlock: {
        backgroundColor: '#f1f5f9', // slate-100
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    codeText: {
        fontFamily: 'monospace', // Platform specific font handling usually needed, but this works for basic web/some mobile
        fontSize: 12,
        color: '#334155', // slate-700
    },
    infoBox: {
        backgroundColor: '#eff6ff', // blue-50
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6', // blue-500
    },
    infoBoxText: {
        fontSize: 13,
        color: '#1e40af', // blue-800
        lineHeight: 20,
    },
    tipsBox: {
        backgroundColor: '#fffbeb', // amber-50
        padding: 12,
        borderRadius: 6,
        marginTop: 8,
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400e', // amber-800
        marginBottom: 8,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 4,
    },
    bulletText: {
        fontSize: 13,
        color: '#92400e', // amber-800
        flex: 1,
        lineHeight: 20,
    },
    // Form Styles
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    helperText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    helperTextSmall: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: theme.colors.text,
        backgroundColor: '#fff',
    },
    typeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: '#2563eb', // Blue border for focus/active state
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    typeSelectorText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    toggleHelper: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    dateInputText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
        paddingTop: 16,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    submitButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#0044CC', // Primary blue
    },
    submitButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    // Picker Modal Styles
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
        width: '100%',
        maxHeight: '70%',
        ...theme.shadows.card,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    closePickerBtn: {
        marginTop: 16,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: theme.borderRadius.md,
    },
    closePickerText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    // Delete Confirmation Modal Styles
    deleteTripModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        alignSelf: 'center',
        ...theme.shadows.card,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    deleteModalMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    deleteModalCancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
    },
    deleteModalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    deleteModalConfirmBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#2563eb',
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
