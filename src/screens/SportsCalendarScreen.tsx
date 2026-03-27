import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Pressable,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCampers } from '../api/campers';
import { useStaff } from '../api/staff';
import { useCompany } from '../contexts/CompanyContext';

/** DB + web use lowercase; labels are for UI only (see migrations sports_calendar_home_away_check). */
const HOME_AWAY_OPTIONS: { value: string; label: string }[] = [
    { value: 'home', label: 'Home' },
    { value: 'away', label: 'Away' },
    { value: 'neutral', label: 'Neutral' },
];

function homeAwayLabel(value: string): string {
    const row = HOME_AWAY_OPTIONS.find((o) => o.value === value);
    return row?.label || value || '';
}

function normalizeHomeAway(raw: string | undefined | null): string {
    if (!raw) return '';
    const l = String(raw).trim().toLowerCase();
    if (l === 'home' || l === 'away' || l === 'neutral') return l;
    return '';
}

interface SportsEvent {
    id: string;
    title: string;
    date: Date;
    location: string;
    sport: string;
    division: string;
    gender: string;
    eventType: string;
    // Extended fields for Edit Form
    customSport?: string;
    /** Raw `sport_type` from DB (e.g. "Other") for forms */
    dbSportType?: string;
    divisionIds?: string[];
    team?: string;
    opponent?: string;
    homeAway?: string;
    departTime?: string;
    startTimeField?: string;
    description?: string;
    mealOptions?: string[];
    mealNotes?: string;
    divisionProvidesCoach?: boolean;
    divisionProvidesRef?: boolean;
    divisions?: Array<{ id: string; name: string; gender?: string }>;
    rosterCount?: number;
}

export const SportsCalendarScreen = ({ navigation }: any) => {
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();
    const { data: camperData = [] } = useCampers(companyId, season);
    const { data: staffData = [] } = useStaff(companyId, season);
    const campers = camperData.map((c: any) => ({ id: c.id, name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(), grade: c.grade || '' }));
    const staffMembers = staffData.map((s: any) => ({ id: s.id, name: s.name, role: s.role || s.staff_type || 'Staff' }));
    const [activeView, setActiveView] = useState('Month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showUploadCSVModal, setShowUploadCSVModal] = useState(false);
    const [showListViewModal, setShowListViewModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Search and filter states
    const [eventSearch, setEventSearch] = useState('');
    const [showDivisionFilter, setShowDivisionFilter] = useState(false);
    const [showGenderFilter, setShowGenderFilter] = useState(false);
    const [showSportFilter, setShowSportFilter] = useState(false);
    const [showEventTypeFilter, setShowEventTypeFilter] = useState(false);
    const [showLocationFilter, setShowLocationFilter] = useState(false);
    const [showSortFilter, setShowSortFilter] = useState(false);

    // Selected filter values
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [selectedGender, setSelectedGender] = useState('All Genders');
    const [selectedSport, setSelectedSport] = useState('All Sports');
    const [selectedEventType, setSelectedEventType] = useState('All Event Types');
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [selectedSort, setSelectedSort] = useState('Sort by Date');



    type EventFormShape = {
        title: string;
        event_date: Date;
        sport_type: string;
        custom_sport_type: string;
        event_type: string;
        division_ids: string[];
        home_away: string;
        depart_time: string;
        start_time_field: string;
        location: string;
        team: string;
        opponent: string;
        description: string;
        meal_options: string[];
        meal_notes: string;
        division_provides_coach: boolean;
        division_provides_ref: boolean;
    };

    const defaultAddForm = (): EventFormShape => ({
        title: '',
        event_date: new Date(),
        sport_type: '',
        custom_sport_type: '',
        event_type: '',
        division_ids: [],
        home_away: '',
        depart_time: '',
        start_time_field: '',
        location: '',
        team: '',
        opponent: '',
        description: '',
        meal_options: [],
        meal_notes: '',
        division_provides_coach: false,
        division_provides_ref: false,
    });

    const [addFormData, setAddFormData] = useState<EventFormShape>(defaultAddForm);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerContext, setDatePickerContext] = useState<'add' | 'edit' | null>(null);
    const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

    // Edit Event Modal State
    const [showEditEventModal, setShowEditEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);
    const [editFormData, setEditFormData] = useState({
        id: '',
        title: '',
        event_date: new Date(),
        sport_type: '',
        custom_sport_type: '',
        event_type: '',
        division_ids: [] as string[],
        home_away: '',
        depart_time: '',
        start_time_field: '',
        location: '',
        team: '',
        opponent: '',
        description: '',
        meal_options: [] as string[],
        meal_notes: '',
        division_provides_coach: false,
        division_provides_ref: false,
    });

    // Manage Roster State
    const [showManageRosterModal, setShowManageRosterModal] = useState(false);
    const [manageRosterActiveTab, setManageRosterActiveTab] = useState<'campers' | 'staff' | 'templates'>('campers');
    const [rosterSearchTerm, setRosterSearchTerm] = useState('');
    const [selectedRosterEvent, setSelectedRosterEvent] = useState<any>(null);
    const [selectedCampers, setSelectedCampers] = useState<Set<string>>(new Set());
    const [showRosterSortModal, setShowRosterSortModal] = useState(false);
    const [rosterSortBy, setRosterSortBy] = useState('Name');
    const [showEventOptionsModal, setShowEventOptionsModal] = useState(false);
    const [selectedEventOptions, setSelectedEventOptions] = useState<any>(null);
    const [guideActiveTab, setGuideActiveTab] = useState('Staff');

    // Staff Assignment State
    const [assignedRefs, setAssignedRefs] = useState<string[]>([]);
    const [divisionProvidesCoach, setDivisionProvidesCoach] = useState(false);
    const [staffSearchTerm, setStaffSearchTerm] = useState('');
    const [showStaffSelectionModal, setShowStaffSelectionModal] = useState(false);
    const [staffSelectionType, setStaffSelectionType] = useState<'ref' | null>(null);



    const toggleCamperSelection = (id: string) => {
        const newSelection = new Set(selectedCampers);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedCampers(newSelection);
    };

    /** Shared pickers for Add + Edit sports event forms */
    type FormPickerKind = 'sport' | 'event' | 'home' | 'divisions';
    const [activeFormPicker, setActiveFormPicker] = useState<null | { kind: FormPickerKind; target: 'add' | 'edit' }>(null);

    // Options from Tyler-Hill Web Code
    const sportTypeOptions = ['Baseball', 'Basketball', 'Dance', 'Football', 'Golf', 'Gymnastics', 'Hockey', 'Lacrosse', 'Soccer', 'Softball', 'Tennis', 'Volleyball', 'Waterfront', 'Other'];
    const eventTypeOptions = ['WC One Day Tournament', 'WC Knock Out Tournament', 'Exhibition/Friendly', 'Invitational', 'Other'];
    const mealOptions = ['Breakfast', 'Snack', 'Lunch', 'Dinner', 'Other'];

    // Fetch sports events from Supabase
    const { data: sportsCalendarData = [] } = useQuery({
        queryKey: ['sports_calendar', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const [eventsRes, divisionLinksRes, rosterRes] = await Promise.all([
                supabase
                    .from('sports_calendar')
                    .select(`
                        *,
                        division:divisions(id, name, gender),
                        sports_calendar_divisions(division_id, division:divisions(id, name, gender))
                    `)
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .order('event_date', { ascending: true }),
                supabase
                    .from('sports_calendar_divisions')
                    .select('sports_event_id, division_id, division:divisions(id, name, gender)')
                    .eq('company_id', companyId),
                supabase
                    .from('sports_event_roster')
                    .select('event_id')
                    .eq('company_id', companyId),
            ]);
            if (eventsRes.error) throw eventsRes.error;
            if (divisionLinksRes.error) throw divisionLinksRes.error;
            if (rosterRes.error) throw rosterRes.error;

            const divisionMap = new Map<string, Array<{ id: string; name: string; gender?: string }>>();
            (divisionLinksRes.data || []).forEach((row: any) => {
                if (!divisionMap.has(row.sports_event_id)) divisionMap.set(row.sports_event_id, []);
                if (row.division) {
                    divisionMap.get(row.sports_event_id)!.push({
                        id: row.division.id,
                        name: row.division.name,
                        gender: row.division.gender,
                    });
                }
            });

            const rosterCounts = new Map<string, number>();
            (rosterRes.data || []).forEach((row: any) => {
                rosterCounts.set(row.event_id, (rosterCounts.get(row.event_id) || 0) + 1);
            });

            return (eventsRes.data || []).map((event: any) => {
                const joinedDivisions = divisionMap.get(event.id) || [];
                const fallbackDivision = event.division
                    ? [{ id: event.division.id, name: event.division.name, gender: event.division.gender }]
                    : [];
                return {
                    ...event,
                    _divisions: joinedDivisions.length > 0 ? joinedDivisions : fallbackDivision,
                    _rosterCount: rosterCounts.get(event.id) || 0,
                };
            });
        },
        enabled: !!companyId,
    });

    /** All company divisions for add/edit pickers (same source as web Sports Calendar). */
    const { data: companyDivisions = [] } = useQuery({
        queryKey: ['divisions_picker', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('id, name, gender, sort_order')
                .eq('company_id', companyId)
                .eq('is_active', true);
            if (error) throw error;
            const rows = data || [];
            return [...rows].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        },
        enabled: !!companyId,
    });

    const events: SportsEvent[] = sportsCalendarData.map((e: any) => ({
        id: e.id,
        title: e.title || e.event_name || '',
        date: new Date(e.event_date + 'T00:00:00'),
        location: e.location || '',
        dbSportType: e.sport_type || '',
        sport:
            e.sport_type === 'Other' && e.custom_sport_type
                ? e.custom_sport_type
                : e.sport_type || e.custom_sport_type || '',
        customSport: e.custom_sport_type || '',
        division: (e._divisions && e._divisions[0]?.name) || '',
        gender: (e._divisions && e._divisions[0]?.gender) || '',
        eventType: e.event_type || '',
        homeAway: e.home_away || '',
        departTime: e.depart_time || '',
        startTimeField: e.start_time_field || '',
        team: e.team || '',
        opponent: e.opponent || '',
        description: e.description || '',
        mealOptions: e.meal_options || [],
        mealNotes: e.meal_notes || '',
        divisionProvidesCoach: e.division_provides_coach || false,
        divisionProvidesRef: e.division_provides_ref || false,
        divisions: e._divisions || [],
        divisionIds: (e._divisions || []).map((d: any) => d.id),
        rosterCount: e._rosterCount || 0,
    }));

    useEffect(() => {
        if (events.length === 0) return;
        const firstEventDate = events[0].date;
        setCurrentDate(new Date(firstEventDate));
        setSelectedDate(new Date(firstEventDate));
    }, [sportsCalendarData.length]);

    const divisionOptions = useMemo(
        () => Array.from(new Set(events.flatMap((event) => (event.divisions || []).map((d: any) => d.id)))),
        [events]
    );
    const divisionNameById = useMemo(() => {
        const map = new Map<string, string>();
        events.forEach((event) => {
            (event.divisions || []).forEach((d: any) => map.set(d.id, d.name));
        });
        return map;
    }, [events]);
    const divisions = divisionOptions;
    const genders = ['All Genders', 'Boys', 'Girls'];
    const sports = ['All Sports', ...Array.from(new Set(events.map((e) => e.sport).filter(Boolean))).sort()];
    const eventTypes = ['All Event Types', ...Array.from(new Set(events.map((e) => e.eventType).filter(Boolean))).sort()];
    const locations = ['All Locations', ...Array.from(new Set(events.map((e) => e.location).filter(Boolean))).sort()];
    const sortOptions = ['Sort by Date', 'Sort by Name', 'Sort by Sport', 'Sort by Location'];

    const formatDate = (date: Date): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

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
        const totalCells = days.length;
        const remainingCells = 42 - totalCells; // 6 rows x 7 days
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const getEventsForDate = (date: Date) => {
        return events.filter(event => {
            const eventDate = event.date;
            return eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear();
        });
    };

    const isSameDate = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    };

    const filteredEvents = events.filter(event => {
        if (eventSearch && !event.title.toLowerCase().includes(eventSearch.toLowerCase())) return false;
        if (selectedDivisions.length > 0) {
            const eventDivisionIds = (event.divisions || []).map((d: any) => d.id);
            if (!eventDivisionIds.some((id) => selectedDivisions.includes(id))) return false;
        }
        if (selectedGender !== 'All Genders') {
            const genders = (event.divisions || []).map((d: any) => (d.gender || '').toLowerCase());
            if (genders.length > 0 && !genders.includes(selectedGender.toLowerCase())) return false;
        }
        if (selectedSport !== 'All Sports' && event.sport !== selectedSport) return false;
        if (selectedEventType !== 'All Event Types' && event.eventType !== selectedEventType) return false;
        if (selectedLocation !== 'All Locations' && event.location !== selectedLocation) return false;
        return true;
    });

    const groupedEventsByMonth = useMemo(() => {
        return filteredEvents.reduce((acc: Record<string, SportsEvent[]>, event) => {
            const key = event.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!acc[key]) acc[key] = [];
            acc[key].push(event);
            return acc;
        }, {});
    }, [filteredEvents]);

    const handleAddEvent = async () => {
        if (!addFormData.sport_type && !addFormData.custom_sport_type) {
            Alert.alert('Required', 'Please select a sport type (or enter a custom sport if you chose Other).');
            return;
        }
        if (addFormData.sport_type === 'Other' && !addFormData.custom_sport_type?.trim()) {
            Alert.alert('Required', 'Please enter a custom sport name.');
            return;
        }
        if (
            addFormData.event_type === 'Other' &&
            addFormData.sport_type !== 'Other' &&
            !addFormData.custom_sport_type?.trim()
        ) {
            Alert.alert('Required', 'Please enter a description for “Other” event type.');
            return;
        }
        if (!addFormData.title?.trim()) {
            Alert.alert('Required', 'Please enter a title.');
            return;
        }
        if (!companyId) {
            Alert.alert('Error', 'No company is selected. Sign in again or pick a camp in settings.');
            return;
        }
        if (isSubmittingAdd) return;
        setIsSubmittingAdd(true);

        const dateStr = `${addFormData.event_date.getFullYear()}-${String(addFormData.event_date.getMonth() + 1).padStart(2, '0')}-${String(addFormData.event_date.getDate()).padStart(2, '0')}`;

        const submitData = {
            event_date: dateStr,
            title: addFormData.title.trim(),
            description: addFormData.description || null,
            sport_type: addFormData.sport_type === 'Other' ? 'Other' : addFormData.sport_type,
            custom_sport_type:
                addFormData.sport_type === 'Other' || addFormData.event_type === 'Other'
                    ? addFormData.custom_sport_type || null
                    : null,
            event_type: addFormData.event_type || null,
            depart_time: addFormData.depart_time || null,
            start_time_field: addFormData.start_time_field || null,
            location: addFormData.location || null,
            team: addFormData.team || null,
            opponent: addFormData.opponent || null,
            home_away: normalizeHomeAway(addFormData.home_away) || null,
            division_id: addFormData.division_ids.length === 1 ? addFormData.division_ids[0] : null,
            division_provides_coach: addFormData.division_provides_coach,
            division_provides_ref: addFormData.division_provides_ref,
            meal_options: addFormData.meal_options ?? [],
            meal_notes: addFormData.meal_notes || null,
            season,
            company_id: companyId,
        };

        try {
            const { data: newEvent, error } = await supabase.from('sports_calendar').insert(submitData).select().single();

            if (error || !newEvent) {
                console.error('Error adding event:', error);
                Alert.alert('Error adding event', error?.message || 'Unknown error');
                return;
            }

            if (addFormData.division_ids.length > 0) {
                const junctionData = addFormData.division_ids.map((divId) => ({
                    sports_event_id: newEvent.id,
                    division_id: divId,
                    company_id: companyId,
                }));
                const { error: junctionErr } = await supabase.from('sports_calendar_divisions').insert(junctionData);
                if (junctionErr) console.warn('Sports divisions insert:', junctionErr);
            }

            const tripData = {
                name: addFormData.title.trim(),
                date: dateStr,
                type: 'sporting_event',
                event_type:
                    addFormData.sport_type === 'Other' ? addFormData.custom_sport_type : addFormData.sport_type,
                destination: addFormData.location || null,
                departure_time: addFormData.depart_time || null,
                status: 'pending',
                sports_event_id: newEvent.id,
                season,
                company_id: companyId,
            };
            const { error: tripErr } = await supabase.from('trips').insert(tripData);
            if (tripErr) console.warn('Trip insert (optional):', tripErr);

            queryClient.invalidateQueries({ queryKey: ['sports_calendar', companyId, season] });
            queryClient.invalidateQueries({ queryKey: ['calendar_events', companyId] });
            setShowAddEventModal(false);
            setAddFormData(defaultAddForm());
            Alert.alert('Success', 'Sports event added.');
        } finally {
            setIsSubmittingAdd(false);
        }
    };

    const handleDeleteClick = (eventId: string) => {
        setEventToDelete(eventId);
        setShowDeleteConfirmModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        console.log('[DELETE] sports_calendar start', eventToDelete);
        try {
            const { error } = await supabase.from('sports_calendar').delete().eq('id', eventToDelete);
            console.log('[DELETE] sports_calendar response', { error: error?.message ?? null });
            if (error) {
                Alert.alert('Delete failed', error.message);
                return;
            }
            await queryClient.invalidateQueries({ queryKey: ['sports_calendar', companyId, season] });
            await queryClient.invalidateQueries({ queryKey: ['calendar_events', companyId] });
            setShowDeleteConfirmModal(false);
            setEventToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        if (isDeleting) return;
        setShowDeleteConfirmModal(false);
        setEventToDelete(null);
    };

    const handleEdit = (event: SportsEvent) => {
        setEditingEvent(event);
        setEditFormData({
            id: event.id,
            title: event.title,
            event_date: event.date,
            sport_type: event.dbSportType || event.sport,
            custom_sport_type: event.customSport || '',
            event_type: event.eventType,
            division_ids: event.divisionIds?.length ? event.divisionIds : (event.divisions || []).map((d: any) => d.id),
            home_away: normalizeHomeAway(event.homeAway),
            depart_time: event.departTime || '',
            start_time_field: event.startTimeField || '',
            location: event.location,
            team: event.team || '',
            opponent: event.opponent || '',
            description: event.description || '',
            meal_options: event.mealOptions || [],
            meal_notes: event.mealNotes || '',
            division_provides_coach: event.divisionProvidesCoach || false,
            division_provides_ref: event.divisionProvidesRef || false,
        });
        setShowEditEventModal(true);
    };

    const handleUpdateEvent = async () => {
        const dateStr = editFormData.event_date instanceof Date
            ? `${editFormData.event_date.getFullYear()}-${String(editFormData.event_date.getMonth() + 1).padStart(2, '0')}-${String(editFormData.event_date.getDate()).padStart(2, '0')}`
            : editFormData.event_date;
        const submitData = {
            title: editFormData.title,
            event_date: dateStr,
            sport_type: editFormData.sport_type === 'Other' ? 'Other' : editFormData.sport_type,
            custom_sport_type:
                editFormData.sport_type === 'Other' || editFormData.event_type === 'Other'
                    ? editFormData.custom_sport_type || null
                    : null,
            event_type: editFormData.event_type || null,
            home_away: normalizeHomeAway(editFormData.home_away) || null,
            depart_time: editFormData.depart_time || null,
            start_time_field: editFormData.start_time_field || null,
            location: editFormData.location || null,
            team: editFormData.team || null,
            opponent: editFormData.opponent || null,
            description: editFormData.description || null,
            meal_options: editFormData.meal_options ?? [],
            meal_notes: editFormData.meal_notes || null,
            division_provides_coach: editFormData.division_provides_coach,
            division_provides_ref: editFormData.division_provides_ref,
            division_id: editFormData.division_ids.length === 1 ? editFormData.division_ids[0] : null,
        };
        const { error } = await supabase.from('sports_calendar').update(submitData).eq('id', editFormData.id);
        if (error) {
            Alert.alert('Error updating event', error.message);
            return;
        }

        await supabase.from('sports_calendar_divisions').delete().eq('sports_event_id', editFormData.id);
        if (editFormData.division_ids.length > 0) {
            const junctionData = editFormData.division_ids.map((divId) => ({
                sports_event_id: editFormData.id,
                division_id: divId,
                company_id: companyId,
            }));
            const { error: jErr } = await supabase.from('sports_calendar_divisions').insert(junctionData);
            if (jErr) console.warn('Junction update:', jErr);
        }

        queryClient.invalidateQueries({ queryKey: ['sports_calendar', companyId, season] });
        queryClient.invalidateQueries({ queryKey: ['calendar_events', companyId] });
        setShowEditEventModal(false);
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

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const handleSelectFileOption = (option: string) => {
        console.log('Selected:', option);
        setShowUploadCSVModal(false);
        // TODO: Handle file selection
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const renderManageRosterModal = () => (
        <>
            <Modal
                visible={showManageRosterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowManageRosterModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowManageRosterModal(false)}
                >
                    <Pressable
                        style={[styles.addEventModal, { height: '90%', maxHeight: '90%' }]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="people" size={20} color={theme.colors.text} />
                                <Text style={styles.modalTitle}>
                                    Manage Roster: {selectedRosterEvent?.title || 'Event'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowManageRosterModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                            <View style={{ flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: theme.colors.border }}>
                                {['campers', 'staff', 'templates'].map((tab) => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                            backgroundColor: manageRosterActiveTab === tab ? 'white' : 'transparent',
                                            borderRadius: 6,
                                            shadowColor: manageRosterActiveTab === tab ? '#000' : 'transparent',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: manageRosterActiveTab === tab ? 0.1 : 0,
                                            shadowRadius: 1,
                                            elevation: manageRosterActiveTab === tab ? 2 : 0,
                                        }}
                                        onPress={() => setManageRosterActiveTab(tab as any)}
                                    >
                                        <Text numberOfLines={1} style={{
                                            fontSize: 12,
                                            fontWeight: manageRosterActiveTab === tab ? '600' : '400',
                                            color: manageRosterActiveTab === tab ? theme.colors.text : theme.colors.textSecondary,
                                            textTransform: 'capitalize'
                                        }}>
                                            {tab === 'staff' ? 'Staff Assignments' : tab === 'templates' ? 'Saved Templates' : 'Select Campers'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Content */}
                        <View style={{ flex: 1, paddingHorizontal: 16 }}>
                            {manageRosterActiveTab === 'campers' && (
                                <>
                                    {/* Search and Filter */}
                                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                        <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
                                            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Search by name..."
                                                value={rosterSearchTerm}
                                                onChangeText={setRosterSearchTerm}
                                            />
                                        </View>
                                        <View style={{ justifyContent: 'center' }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, height: 44, minWidth: 90, justifyContent: 'space-between' }}
                                                onPress={() => setShowRosterSortModal(true)}
                                            >
                                                <Text style={{ color: theme.colors.text }}>{rosterSortBy}</Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 }}>
                                        {selectedCampers.size} of {campers.length} campers selected
                                    </Text>

                                    {/* Campers List */}
                                    <ScrollView style={{ flex: 1 }}>
                                        {campers.filter(c => c.name.toLowerCase().includes(rosterSearchTerm.toLowerCase())).map((camper) => (
                                            <TouchableOpacity
                                                key={camper.id}
                                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
                                                onPress={() => toggleCamperSelection(camper.id)}
                                            >
                                                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: selectedCampers.has(camper.id) ? theme.colors.secondary : theme.colors.textSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                    {selectedCampers.has(camper.id) && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.secondary }} />}
                                                </View>
                                                <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: theme.colors.text }}>{camper.name}</Text>
                                                <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>Grade: {camper.grade}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            {manageRosterActiveTab === 'staff' && (
                                <ScrollView style={{ flex: 1 }}>
                                    {/* Coaches Section */}
                                    <View style={{ marginBottom: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>Coaches</Text>
                                            <TouchableOpacity
                                                style={{ backgroundColor: divisionProvidesCoach ? '#13B4B2' : theme.colors.surface, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#13B4B2' }}
                                                onPress={() => setDivisionProvidesCoach(!divisionProvidesCoach)}
                                            >
                                                <Text style={{ fontSize: 12, color: divisionProvidesCoach ? 'white' : '#13B4B2', fontWeight: 'bold' }}>Division will provide</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {divisionProvidesCoach && (
                                            <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>Coach assignment pending - Division will provide</Text>
                                        )}
                                    </View>

                                    {/* Referees Section */}
                                    <View style={{ marginBottom: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>Referees</Text>
                                        </View>

                                        <View style={{ position: 'relative', zIndex: 1000, marginBottom: 12 }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 }}
                                                onPress={() => {
                                                    setStaffSelectionType('ref');
                                                    setShowStaffSelectionModal(true);
                                                }}
                                            >
                                                <Text style={{ color: theme.colors.textSecondary }}>Add referee...</Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={{ gap: 8 }}>
                                            {assignedRefs.map(staffId => {
                                                const ref = staffMembers.find(s => s.id === staffId);
                                                return (
                                                    <View key={staffId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: theme.colors.surface, borderRadius: 8 }}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.text }}>{ref?.name}</Text>
                                                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{ref?.role}</Text>
                                                        </View>
                                                        <TouchableOpacity onPress={() => setAssignedRefs(assignedRefs.filter(id => id !== staffId))}>
                                                            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })}
                                            {assignedRefs.length === 0 && (
                                                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, fontStyle: 'italic' }}>No referees assigned</Text>
                                            )}
                                        </View>
                                    </View>
                                </ScrollView>
                            )}

                            {manageRosterActiveTab === 'templates' && (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, textAlign: 'center' }}>
                                        No saved templates
                                    </Text>
                                    <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                                        Create rosters and save them as templates for quick reuse
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Footer */}
                        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="save-outline" size={18} color={theme.colors.textSecondary} />
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Save as Template</Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1 }} />

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}
                                    onPress={() => setShowManageRosterModal(false)}
                                >
                                    <Text style={{ fontWeight: '600', color: theme.colors.text }}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.secondary }}
                                    onPress={() => {
                                        setShowManageRosterModal(false);
                                    }}
                                >
                                    <Text style={{ fontWeight: '600', color: 'white' }}>Save Roster</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Roster Sort Modal - Nested here to ensure z-index priority over ManageRosterModal */}
            <Modal
                visible={showRosterSortModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRosterSortModal(false)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setShowRosterSortModal(false)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Sort Order</Text>
                            <TouchableOpacity onPress={() => setShowRosterSortModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {['Grade', 'Age', 'Name'].map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={styles.filterOption}
                                    onPress={() => {
                                        setRosterSortBy(option);
                                        setShowRosterSortModal(false);
                                    }}
                                >
                                    <Text style={styles.filterOptionText}>{option}</Text>
                                    {rosterSortBy === option && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Staff Selection Modal (Bottom Sheet) */}
            <Modal
                visible={showStaffSelectionModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowStaffSelectionModal(false);
                    setStaffSearchTerm('');
                }}
            >
                <Pressable
                    style={styles.filterModalOverlay}
                    onPress={() => {
                        setShowStaffSelectionModal(false);
                        setStaffSearchTerm('');
                    }}
                >
                    <Pressable style={[styles.filterModalContent, { maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select {staffSelectionType === 'ref' ? 'Referee' : 'Staff'}</Text>
                            <TouchableOpacity onPress={() => {
                                setShowStaffSelectionModal(false);
                                setStaffSearchTerm('');
                            }}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 16 }}>
                            <View style={[styles.searchBar, { marginBottom: 12 }]}>
                                <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search staff..."
                                    value={staffSearchTerm}
                                    onChangeText={setStaffSearchTerm}
                                    autoFocus
                                />
                            </View>

                            <ScrollView style={{ maxHeight: 400 }}>
                                {staffMembers
                                    .filter(s =>
                                        s.name.toLowerCase().includes(staffSearchTerm.toLowerCase()) &&
                                        !assignedRefs.includes(s.id)
                                    )
                                    .map((staff) => (
                                        <TouchableOpacity
                                            key={staff.id}
                                            style={{
                                                paddingVertical: 14,
                                                borderBottomWidth: 1,
                                                borderBottomColor: theme.colors.border,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                            onPress={() => {
                                                if (staffSelectionType === 'ref') {
                                                    setAssignedRefs([...assignedRefs, staff.id]);
                                                }
                                                setShowStaffSelectionModal(false);
                                                setStaffSearchTerm('');
                                            }}
                                        >
                                            <View>
                                                <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>{staff.name}</Text>
                                                <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>{staff.role}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
                                        </TouchableOpacity>
                                    ))}
                                {staffMembers.filter(s => s.name.toLowerCase().includes(staffSearchTerm.toLowerCase()) && !assignedRefs.includes(s.id)).length === 0 && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: theme.colors.textSecondary }}>No staff found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );

    const renderGuideModal = () => (
        <Modal
            visible={showGuideModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowGuideModal(false)}
        >
            <Pressable
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20
                }}
                onPress={() => setShowGuideModal(false)}
            >
                <Pressable
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 600,
                        maxHeight: '90%',
                        overflow: 'hidden',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6'
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>CSV Upload Format Guide</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tab Bar */}
                    <View style={{ backgroundColor: '#F3F4F6', paddingVertical: 8 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
                            {['Children', 'Staff', 'Medications', 'Trips', 'Menu', 'Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'].map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setGuideActiveTab(tab)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                        backgroundColor: guideActiveTab === tab ? 'white' : 'transparent',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: guideActiveTab === tab ? '600' : '400',
                                        color: guideActiveTab === tab ? theme.colors.text : theme.colors.textSecondary
                                    }}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <ScrollView style={{ padding: 20 }}>
                        {guideActiveTab === 'Staff' || guideActiveTab === 'Children' ? (
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 4 }}>
                                    {guideActiveTab === 'Staff' ? 'Staff Directory' : 'Children Roster'}
                                </Text>
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 20 }}>
                                    {guideActiveTab === 'Staff' ? 'CSV format for staff directory upload' : 'CSV format for children roster upload'}
                                </Text>

                                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>Required Columns (first row):</Text>
                                <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                    <Text style={{ fontFamily: 'monospace', fontSize: 11, color: theme.colors.text, lineHeight: 18 }}>
                                        {guideActiveTab === 'Staff'
                                            ? 'name, email, phone, role, department, hire_date, leader_id, status, season'
                                            : 'first_name, last_name, person_id, age, grade, gender, guardian_phone, guardian_email, medical_notes, allergies, division_id, leader_id, emergency_contact, status, season'
                                        }
                                    </Text>
                                </View>

                                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>Example Data Row:</Text>
                                <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                    <Text style={{ fontFamily: 'monospace', fontSize: 11, color: theme.colors.text, lineHeight: 18 }}>
                                        {guideActiveTab === 'Staff'
                                            ? 'Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, <leader_id>, active, Summer 2024'
                                            : 'John, Doe, P12345, 10, 5, Male, 555-1234, parent@email.com, None, Peanuts, <division_id>, <leader_id>, Jane Doe 555-5678, active, Summer 2024'
                                        }
                                    </Text>
                                </View>

                                <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 18, flex: 1 }}>
                                            <Text style={{ fontWeight: '700' }}>Important Notes:</Text>{' '}
                                            {guideActiveTab === 'Staff'
                                                ? 'leader_id must be a valid UUID from staff table. hire_date format: YYYY-MM-DD'
                                                : 'REQUIRED: first_name, last_name and person_id. All other fields are optional. division_id and leader_id must be valid UUIDs from database if provided.'
                                            }
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ backgroundColor: '#FFFBEB', padding: 16, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 8 }}>General Tips:</Text>
                                    <View style={{ gap: 6 }}>
                                        {[
                                            'First row must contain column names exactly as shown',
                                            'Use commas to separate values',
                                            'Use backslash before commas within text fields (e.g., "Item 1\\, Item 2")',
                                            'Leave fields empty for optional columns',
                                            'Maximum 1000 rows per upload',
                                            'Dates must be in YYYY-MM-DD format',
                                            'UUIDs can be obtained from the backend for existing records'
                                        ].map((tip, i) => (
                                            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                                                <Text style={{ fontSize: 13, color: '#92400E' }}>•</Text>
                                                <Text style={{ fontSize: 13, color: '#92400E', flex: 1 }}>{tip}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.textSecondary }}>Guide for {guideActiveTab} coming soon...</Text>
                            </View>
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );

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
                        <View style={styles.titleRow}>
                            <Ionicons name="trophy-outline" size={32} color={theme.colors.text} />
                            <Text style={styles.title}>Sports Calendar</Text>
                        </View>
                        <Text style={styles.subtitle}>Track sports events and games</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <View style={styles.iconButton}>
                            <View style={styles.orangeIcon}>
                                <Ionicons name="restaurant-outline" size={20} color="white" />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setShowListViewModal(true)}
                        >
                            <Ionicons name="list-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setShowGuideModal(true)}
                        >
                            <Ionicons name="help-circle-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.uploadBtn}
                            onPress={() => setShowUploadCSVModal(true)}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                            <Text style={styles.uploadBtnText}>Upload CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => {
                                setAddFormData(defaultAddForm());
                                setShowAddEventModal(true);
                            }}
                        >
                            <Ionicons name="add" size={18} color="white" />
                            <Text style={styles.addBtnText}>Add Event</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filters Card */}
                <StyledCard style={styles.filterCard}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search events..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={eventSearch}
                            onChangeText={setEventSearch}
                        />
                    </View>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => setShowDivisionFilter(true)}
                        >
                            <Text style={styles.filterText}>{selectedDivisions.length > 0 ? `Divisions (${selectedDivisions.length})` : 'All Divisions'}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => setShowGenderFilter(true)}
                        >
                            <Text style={styles.filterText}>{selectedGender}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => setShowSportFilter(true)}
                        >
                            <Text style={styles.filterText}>{selectedSport}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => setShowEventTypeFilter(true)}
                        >
                            <Text style={styles.filterText}>{selectedEventType}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => setShowLocationFilter(true)}
                        >
                            <Text style={styles.filterText}>{selectedLocation}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => setShowSortFilter(true)}
                        >
                            <Text style={styles.filterText}>{selectedSort}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                {/* Calendar Card */}
                <StyledCard style={styles.calendarCard}>
                    {/* Calendar Navigation */}
                    <View style={styles.calendarNav}>
                        <TouchableOpacity onPress={goToToday}>
                            <Text style={styles.navButton}>Today</Text>
                        </TouchableOpacity>
                        <View style={styles.navButtons}>
                            <TouchableOpacity onPress={() => navigateMonth('prev')}>
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.monthYear}>
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </Text>
                            <TouchableOpacity onPress={() => navigateMonth('next')}>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* View Toggles */}
                    <View style={styles.viewToggles}>
                        {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
                            <TouchableOpacity
                                key={view}
                                style={[
                                    styles.viewToggle,
                                    activeView === view && styles.viewToggleActive
                                ]}
                                onPress={() => setActiveView(view)}
                            >
                                <Text style={[
                                    styles.viewToggleText,
                                    activeView === view && styles.viewToggleTextActive
                                ]}>
                                    {view}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    {activeView === 'Month' && (
                        <View style={styles.calendarGrid}>
                            {/* Day Headers */}
                            {dayNames.map((day) => (
                                <View key={day} style={styles.dayHeader}>
                                    <Text style={styles.dayHeaderText}>{day}</Text>
                                </View>
                            ))}

                            {/* Calendar Days */}
                            {getDaysInMonth(currentDate).map((day, index) => {
                                const dayEvents = getEventsForDate(day.fullDate);
                                const isSelected = isSameDate(day.fullDate, selectedDate);
                                const isToday = isSameDate(day.fullDate, new Date());

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.calendarDay,
                                            !day.isCurrentMonth && styles.calendarDayOtherMonth,
                                            isSelected && styles.calendarDaySelected,
                                            isToday && styles.calendarDayToday
                                        ]}
                                        onPress={() => setSelectedDate(day.fullDate)}
                                    >
                                        <Text style={[
                                            styles.dayNumber,
                                            !day.isCurrentMonth && styles.dayNumberOtherMonth,
                                            isSelected && styles.dayNumberSelected
                                        ]}>
                                            {day.date}
                                        </Text>
                                        {dayEvents.length > 0 && (
                                            <View style={styles.eventIndicator}>
                                                <View style={styles.eventDot} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Selected Date Events */}
                    {activeView === 'Month' && getEventsForDate(selectedDate).length > 0 && (
                        <View style={styles.selectedDateEvents}>
                            <Text style={styles.selectedDateTitle}>
                                Events on {formatDate(selectedDate)}
                            </Text>
                            {getEventsForDate(selectedDate).map((event) => (
                                <View key={event.id} style={styles.eventItem}>
                                    <View style={styles.eventItemContent}>
                                        <Text style={styles.eventItemTitle}>{event.title}</Text>
                                        <Text style={styles.eventItemDetails}>
                                            {event.sport} • {event.location} • {event.division}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteClick(event.id)}>
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Month List (web-like cards) */}
                    {activeView === 'Month' && filteredEvents.length > 0 && (
                        <View style={{ marginTop: theme.spacing.lg }}>
                            {Object.entries(groupedEventsByMonth).map(([month, monthEvents]) => (
                                <View key={month} style={{ marginBottom: theme.spacing.lg }}>
                                    <Text style={{ ...theme.typography.h3, marginBottom: theme.spacing.sm }}>{month}</Text>
                                    <View style={{ gap: theme.spacing.md }}>
                                        {monthEvents.map((event) => (
                                            <StyledCard key={`month-${event.id}`} style={styles.eventCard}>
                                                <View style={styles.eventCardHeader}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                                        <Text style={styles.eventDate}>
                                                            {event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.eventActions}>
                                                        <TouchableOpacity style={styles.eventActionBtn} onPress={() => {
                                                            setSelectedEventOptions(event);
                                                            setShowEventOptionsModal(true);
                                                        }}>
                                                            <Ionicons name="people-outline" size={16} color={theme.colors.text} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.eventActionBtn} onPress={() => {
                                                            setSelectedRosterEvent(event);
                                                            setShowManageRosterModal(true);
                                                        }}>
                                                            <Ionicons name="person-add-outline" size={16} color={theme.colors.text} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.eventActionBtn} onPress={() => handleEdit(event)}>
                                                            <Ionicons name="create-outline" size={16} color={theme.colors.text} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.eventActionBtn} onPress={() => handleDeleteClick(event.id)}>
                                                            <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                <View style={styles.eventTags}>
                                                    <View style={[styles.tag, { backgroundColor: '#2563eb' }]}>
                                                        <Text style={styles.tagText}>{event.sport}</Text>
                                                    </View>
                                                    {!!event.eventType && (
                                                        <View style={[styles.tag, { backgroundColor: '#f3f4f6' }]}>
                                                            <Text style={[styles.tagText, { color: theme.colors.text }]}>{event.eventType}</Text>
                                                        </View>
                                                    )}
                                                    {(event.divisions || []).map((division: any) => (
                                                        <View key={`${event.id}-${division.id}`} style={[styles.tag, { backgroundColor: '#14b8a6' }]}>
                                                            <Text style={styles.tagText}>{division.name}</Text>
                                                        </View>
                                                    ))}
                                                    <View style={[styles.tag, { backgroundColor: (event.rosterCount || 0) > 0 ? '#16a34a' : '#ef4444' }]}>
                                                        <Text style={styles.tagText}>{event.rosterCount || 0} roster</Text>
                                                    </View>
                                                </View>
                                                {!!event.location && (
                                                    <View style={styles.eventFooter}>
                                                        <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                                                        <Text style={styles.eventLocation}>{event.location}</Text>
                                                    </View>
                                                )}
                                                {!!event.description && (
                                                    <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                                                )}
                                            </StyledCard>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>

            {/* Add Sports Event Modal (parity with web) */}
            <Modal
                visible={showAddEventModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddEventModal(false)}
            >
                <Pressable style={styles.centeredModalOverlay} onPress={() => setShowAddEventModal(false)}>
                    <Pressable style={[styles.addEventModal, { maxHeight: '92%' }]} onPress={(e) => e.stopPropagation()}>
                        <ScrollView style={styles.addEventScroll} keyboardShouldPersistTaps="handled">
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Add Sports Event</Text>
                                    <Text style={styles.modalSubtitle}>Same fields as web calendar</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowAddEventModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Event Date</Text>
                                <TouchableOpacity
                                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                    onPress={() => {
                                        setDatePickerContext('add');
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text>{formatDate(addFormData.event_date)}</Text>
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.input}
                                    value={addFormData.title}
                                    onChangeText={(text) => setAddFormData({ ...addFormData, title: text })}
                                    placeholder="Event title"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Sport Type *</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'sport', target: 'add' })}>
                                    <Text>{addFormData.sport_type || 'Select sport type'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {addFormData.sport_type === 'Other' && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Custom Sport Type</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={addFormData.custom_sport_type}
                                        onChangeText={(text) => setAddFormData({ ...addFormData, custom_sport_type: text })}
                                        placeholder="Enter sport name"
                                    />
                                </View>
                            )}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Event Type</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'event', target: 'add' })}>
                                    <Text>{addFormData.event_type || 'Select event type'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {addFormData.event_type === 'Other' && addFormData.sport_type !== 'Other' && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Custom (Other event type)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={addFormData.custom_sport_type}
                                        onChangeText={(text) => setAddFormData({ ...addFormData, custom_sport_type: text })}
                                        placeholder="Describe event type"
                                    />
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Divisions (optional)</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'divisions', target: 'add' })}>
                                    <Text numberOfLines={1}>
                                        {addFormData.division_ids.length > 0
                                            ? `${addFormData.division_ids.length} selected`
                                            : 'Select divisions'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Home or Away</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'home', target: 'add' })}>
                                    <Text>{addFormData.home_away ? homeAwayLabel(addFormData.home_away) : 'Select home/away'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {addFormData.home_away === 'away' && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Depart from Camp</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={addFormData.depart_time}
                                        onChangeText={(text) => setAddFormData({ ...addFormData, depart_time: text })}
                                        placeholder="e.g. 10:00 AM"
                                    />
                                </View>
                            )}
                            {(addFormData.home_away === 'home' || addFormData.home_away === 'neutral') && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>
                                        {addFormData.home_away === 'neutral' ? 'Start Time' : 'Start Time (on field)'}
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        value={addFormData.start_time_field}
                                        onChangeText={(text) => setAddFormData({ ...addFormData, start_time_field: text })}
                                        placeholder="e.g. 2:00 PM"
                                    />
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Location (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={addFormData.location}
                                    onChangeText={(text) => setAddFormData({ ...addFormData, location: text })}
                                    placeholder="Venue or address"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Team (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={addFormData.team}
                                    onChangeText={(text) => setAddFormData({ ...addFormData, team: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Opponent (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={addFormData.opponent}
                                    onChangeText={(text) => setAddFormData({ ...addFormData, opponent: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Description (optional)</Text>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                    value={addFormData.description}
                                    onChangeText={(text) => setAddFormData({ ...addFormData, description: text })}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Meal Options</Text>
                                <View style={{ gap: 8 }}>
                                    {mealOptions.map((meal) => (
                                        <TouchableOpacity
                                            key={meal}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                            onPress={() => {
                                                const current = addFormData.meal_options || [];
                                                const updated = current.includes(meal)
                                                    ? current.filter((m) => m !== meal)
                                                    : [...current, meal];
                                                setAddFormData({ ...addFormData, meal_options: updated });
                                            }}
                                        >
                                            <Ionicons
                                                name={addFormData.meal_options?.includes(meal) ? 'checkmark-circle' : 'ellipse-outline'}
                                                size={24}
                                                color={theme.colors.secondary}
                                            />
                                            <Text>{meal}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Staff Assignment</Text>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                    onPress={() =>
                                        setAddFormData({ ...addFormData, division_provides_coach: !addFormData.division_provides_coach })
                                    }
                                >
                                    <Ionicons
                                        name={addFormData.division_provides_coach ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={24}
                                        color={theme.colors.secondary}
                                    />
                                    <Text>Division will provide coach</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                    onPress={() =>
                                        setAddFormData({ ...addFormData, division_provides_ref: !addFormData.division_provides_ref })
                                    }
                                >
                                    <Ionicons
                                        name={addFormData.division_provides_ref ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={24}
                                        color={theme.colors.secondary}
                                    />
                                    <Text>Division will provide ref</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                <TouchableOpacity
                                    style={[styles.cancelButton, { flex: 1, alignItems: 'center' }]}
                                    onPress={() => setShowAddEventModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitButton, { flex: 1, opacity: isSubmittingAdd ? 0.65 : 1 }]}
                                    disabled={isSubmittingAdd}
                                    onPress={handleAddEvent}
                                >
                                    <Text style={styles.submitButtonText}>{isSubmittingAdd ? 'Saving…' : 'Add Event'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>


            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={showGuideModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGuideModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowGuideModal(false)}>
                    <Pressable style={styles.guideModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.guideContent}>
                            <View style={styles.guideSection}>
                                <Text style={styles.sectionTitle}>Sports Events CSV Format</Text>
                                <Text style={styles.sectionSubtitle}>
                                    CSV format for sports events upload
                                </Text>

                                {/* Required Columns */}
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>
                                        event_title, event_date, sport, location, division, gender, event_type
                                    </Text>
                                </View>

                                {/* Example Data */}
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>
                                        Basketball Tournament, 2026-01-15, Basketball, Home, Senior Boys, Boys, Tournament
                                    </Text>
                                </View>

                                {/* Important Notes */}
                                <Text style={styles.importantNote}>
                                    REQUIRED: event_title, event_date, and sport. All other fields are optional.
                                </Text>

                                {/* General Tips */}
                                <View style={styles.tipsBox}>
                                    <Text style={styles.tipsTitle}>General Tips:</Text>
                                    <Text style={styles.tipItem}>• First row must contain column names exactly as shown.</Text>
                                    <Text style={styles.tipItem}>• Use commas to separate values.</Text>
                                    <Text style={styles.tipItem}>• Dates must be in YYYY-MM-DD format.</Text>
                                    <Text style={styles.tipItem}>• Location can be: Home, Away, or Neutral.</Text>
                                    <Text style={styles.tipItem}>• Event types: Tournament, Match, Championship, Practice, Friendly.</Text>
                                    <Text style={styles.tipItem}>• Maximum 1000 rows per upload.</Text>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Upload CSV Modal */}
            <Modal
                visible={showUploadCSVModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUploadCSVModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowUploadCSVModal(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select file</Text>
                        </View>
                        <View style={styles.bottomSheetContent}>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectFileOption('Aloha downloads')}
                            >
                                <Ionicons name="folder-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Aloha downloads</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectFileOption('Other files')}
                            >
                                <Ionicons name="document-text-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Other files</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* List View Modal */}
            <Modal
                visible={showListViewModal}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setShowListViewModal(false)}
            >
                <SafeAreaView style={styles.listViewModal}>
                    <View style={styles.listModalHeader}>
                        <Text style={styles.listModalTitle}>
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => setShowListViewModal(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.listSearchInput}
                            placeholder="Search events..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={eventSearch}
                            onChangeText={setEventSearch}
                        />
                    </View>

                    {/* Filter Controls */}
                    <View style={styles.filterContainer}>
                        <View style={styles.filterRow}>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setShowDivisionFilter(true)}>
                                <Text style={styles.filterButtonText}>{selectedDivisions.length > 0 ? `Divisions (${selectedDivisions.length})` : 'All Divisions'}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setShowGenderFilter(true)}>
                                <Text style={styles.filterButtonText}>{selectedGender}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.filterRow}>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setShowSportFilter(true)}>
                                <Text style={styles.filterButtonText}>{selectedSport}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setShowEventTypeFilter(true)}>
                                <Text style={styles.filterButtonText}>{selectedEventType}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.filterRow}>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setShowLocationFilter(true)}>
                                <Text style={styles.filterButtonText}>{selectedLocation}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setShowSortFilter(true)}>
                                <Text style={styles.filterButtonText}>{selectedSort}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.listViewContent}>
                        {filteredEvents.length === 0 ? (
                            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.textSecondary }}>No sports events match your filters.</Text>
                            </View>
                        ) : (
                            filteredEvents.map((event) => (
                                <View key={`list-${event.id}`} style={styles.eventCard}>
                                    <View style={styles.eventCardHeader}>
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <View style={styles.eventActions}>
                                            <TouchableOpacity
                                                style={styles.eventActionBtn}
                                                onPress={() => {
                                                    setSelectedEventOptions(event);
                                                    setShowEventOptionsModal(true);
                                                }}
                                            >
                                                <Ionicons name="people-outline" size={16} color={theme.colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.eventActionBtn}
                                                onPress={() => {
                                                    setSelectedRosterEvent(event);
                                                    setShowManageRosterModal(true);
                                                }}
                                            >
                                                <Ionicons name="person-add-outline" size={16} color={theme.colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.eventActionBtn}
                                                onPress={() => handleEdit(event)}
                                            >
                                                <Ionicons name="create-outline" size={16} color={theme.colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.eventActionBtn}
                                                onPress={() => handleDeleteClick(event.id)}
                                            >
                                                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={styles.eventDate}>
                                        {event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </Text>

                                    <View style={styles.eventTags}>
                                        <View style={[styles.tag, { backgroundColor: '#3b82f6' }]}>
                                            <Text style={styles.tagText}>{event.sport}</Text>
                                        </View>
                                        {!!event.eventType && (
                                            <View style={[styles.tag, { backgroundColor: '#f59e0b' }]}>
                                                <Text style={styles.tagText}>{event.eventType}</Text>
                                            </View>
                                        )}
                                        {(event.divisions || []).map((division: any) => (
                                            <View key={`${event.id}-${division.id}`} style={[styles.tag, { backgroundColor: '#14b8a6' }]}>
                                                <Text style={styles.tagText}>{division.name}</Text>
                                            </View>
                                        ))}
                                        <View style={[styles.tag, { backgroundColor: (event.rosterCount || 0) > 0 ? '#16a34a' : '#ef4444' }]}>
                                            <Text style={styles.tagText}>{event.rosterCount || 0} roster</Text>
                                        </View>
                                    </View>

                                    {!!event.location && (
                                        <View style={styles.eventFooter}>
                                            <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                                            <Text style={styles.eventLocation}>{event.location}</Text>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteConfirmModal}
                transparent
                animationType="fade"
                onRequestClose={handleCancelDelete}
            >
                <Pressable style={styles.deleteModalOverlay} onPress={handleCancelDelete}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
                        <Text style={styles.deleteModalMessage}>Are you sure? This cannot be undone.</Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.deleteModalCancelBtn}
                                onPress={handleCancelDelete}
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

            {/* Division Filter Modal */}
            <Modal
                visible={showDivisionFilter}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDivisionFilter(false)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setShowDivisionFilter(false)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionFilter(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            <TouchableOpacity
                                style={styles.filterOption}
                                onPress={() => {
                                    setSelectedDivisions([]);
                                    setShowDivisionFilter(false);
                                }}
                            >
                                <Text style={styles.filterOptionText}>All Divisions</Text>
                                {selectedDivisions.length === 0 && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                            </TouchableOpacity>
                            {divisions.map((divisionId) => (
                                <TouchableOpacity
                                    key={divisionId}
                                    style={styles.filterOption}
                                    onPress={() => {
                                        setSelectedDivisions([divisionId]);
                                        setShowDivisionFilter(false);
                                    }}
                                >
                                    <Text style={styles.filterOptionText}>
                                        {divisionNameById.get(divisionId) || 'Unknown Division'}
                                    </Text>
                                    {selectedDivisions.includes(divisionId) && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Gender Filter Modal */}
            <Modal
                visible={showGenderFilter}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGenderFilter(false)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setShowGenderFilter(false)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Gender</Text>
                            <TouchableOpacity onPress={() => setShowGenderFilter(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {['All Genders', 'Boys', 'Girls'].map((gender) => (
                                <TouchableOpacity
                                    key={gender}
                                    style={styles.filterOption}
                                    onPress={() => {
                                        setSelectedGender(gender);
                                        setShowGenderFilter(false);
                                    }}
                                >
                                    <Text style={styles.filterOptionText}>{gender}</Text>
                                    {selectedGender === gender && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Sport Filter Modal */}
            <Modal
                visible={showSportFilter}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSportFilter(false)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setShowSportFilter(false)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Sport</Text>
                            <TouchableOpacity onPress={() => setShowSportFilter(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {['All Sports', 'Soccer', 'Hockey', 'Basketball', 'Baseball', 'Softball'].map((sport) => (
                                <TouchableOpacity
                                    key={sport}
                                    style={styles.filterOption}
                                    onPress={() => {
                                        setSelectedSport(sport);
                                        setShowSportFilter(false);
                                    }}
                                >
                                    <Text style={styles.filterOptionText}>{sport}</Text>
                                    {selectedSport === sport && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Event Type Filter Modal */}
            <Modal
                visible={showEventTypeFilter}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEventTypeFilter(false)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setShowEventTypeFilter(false)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Event Type</Text>
                            <TouchableOpacity onPress={() => setShowEventTypeFilter(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {['All Event Types', 'Invitational', 'Tournament', 'League Game', 'Friendly'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={styles.filterOption}
                                    onPress={() => {
                                        setSelectedEventType(type);
                                        setShowEventTypeFilter(false);
                                    }}
                                >
                                    <Text style={styles.filterOptionText}>{type}</Text>
                                    {selectedEventType === type && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Location Filter Modal */}
            <Modal
                visible={showLocationFilter}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLocationFilter(false)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setShowLocationFilter(false)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Location</Text>
                            <TouchableOpacity onPress={() => setShowLocationFilter(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {['All Locations', 'Bearmont', 'Blue Ridge', 'Equinunk'].map((location) => (
                                <TouchableOpacity
                                    key={location}
                                    style={styles.filterOption}
                                    onPress={() => {
                                        setSelectedLocation(location);
                                        setShowLocationFilter(false);
                                    }}
                                >
                                    <Text style={styles.filterOptionText}>{location}</Text>
                                    {selectedLocation === location && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>



            {/* Sort Filter Modal */}
            <Modal
                visible={showSortFilter}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSortFilter(false)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setShowSortFilter(false)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Sort By</Text>
                            <TouchableOpacity onPress={() => setShowSortFilter(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {['Sort by Date', 'Sort by Division', 'Sort by Sport', 'Sort by Location', 'Sort by Event Type'].map((sort) => (
                                <TouchableOpacity
                                    key={sort}
                                    style={styles.filterOption}
                                    onPress={() => {
                                        setSelectedSort(sort);
                                        setShowSortFilter(false);
                                    }}
                                >
                                    <Text style={styles.filterOptionText}>{sort}</Text>
                                    {selectedSort === sort && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
            {/* Edit Event Modal */}
            <Modal
                visible={showEditEventModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowEditEventModal(false)}
            >
                <Pressable
                    style={styles.centeredModalOverlay}
                    onPress={() => setShowEditEventModal(false)}
                >
                    <Pressable
                        style={styles.addEventModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Sports Event</Text>
                            <TouchableOpacity onPress={() => setShowEditEventModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.addEventScroll}>
                            {/* Event Date */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Event Date</Text>
                                {/* Simple text input for date for now, ideally DatePicker */}
                                <TouchableOpacity
                                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                    onPress={() => {
                                        setDatePickerContext('edit');
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text>{formatDate(editFormData.event_date)}</Text>
                                    <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Title */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editFormData.title}
                                    onChangeText={(text) => setEditFormData({ ...editFormData, title: text })}
                                />
                            </View>

                            {/* Sport Type */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Sport Type</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'sport', target: 'edit' })}>
                                    <Text>{editFormData.sport_type || 'Select Sport'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {editFormData.sport_type === 'Other' && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Custom Sport Type</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editFormData.custom_sport_type}
                                        onChangeText={(text) => setEditFormData({ ...editFormData, custom_sport_type: text })}
                                        placeholder="Enter sport name"
                                    />
                                </View>
                            )}

                            {/* Event Type */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Event Type</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'event', target: 'edit' })}>
                                    <Text>{editFormData.event_type || 'Select Event Type'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Divisions */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Divisions (optional)</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'divisions', target: 'edit' })}>
                                    <Text numberOfLines={1}>
                                        {editFormData.division_ids && editFormData.division_ids.length > 0
                                            ? `${editFormData.division_ids.length} selected`
                                            : 'Select Divisions'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Home or Away */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Home or Away</Text>
                                <TouchableOpacity style={styles.selectInput} onPress={() => setActiveFormPicker({ kind: 'home', target: 'edit' })}>
                                    <Text>{editFormData.home_away ? homeAwayLabel(editFormData.home_away) : 'Select Home/Away'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {editFormData.home_away === 'away' && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Depart from Camp</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editFormData.depart_time}
                                        onChangeText={(text) => setEditFormData({ ...editFormData, depart_time: text })}
                                        placeholder="e.g. 10:00 AM"
                                    />
                                </View>
                            )}
                            {(editFormData.home_away === 'home' || editFormData.home_away === 'neutral') && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>
                                        {editFormData.home_away === 'neutral' ? 'Start Time' : 'Start Time (on field)'}
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editFormData.start_time_field}
                                        onChangeText={(text) => setEditFormData({ ...editFormData, start_time_field: text })}
                                        placeholder="e.g. 2:00 PM"
                                    />
                                </View>
                            )}

                            {/* Location */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Location (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editFormData.location}
                                    onChangeText={(text) => setEditFormData({ ...editFormData, location: text })}
                                />
                            </View>

                            {/* Team */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Team (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editFormData.team}
                                    onChangeText={(text) => setEditFormData({ ...editFormData, team: text })}
                                />
                            </View>

                            {/* Opponent */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Opponent (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editFormData.opponent}
                                    onChangeText={(text) => setEditFormData({ ...editFormData, opponent: text })}
                                />
                            </View>

                            {/* Description */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Description (optional)</Text>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                    value={editFormData.description}
                                    onChangeText={(text) => setEditFormData({ ...editFormData, description: text })}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Meal Options */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Meal Options</Text>
                                <View style={{ gap: 8 }}>
                                    {mealOptions.map(meal => (
                                        <TouchableOpacity
                                            key={meal}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                            onPress={() => {
                                                const current = editFormData.meal_options || [];
                                                const updated = current.includes(meal)
                                                    ? current.filter(m => m !== meal)
                                                    : [...current, meal];
                                                setEditFormData({ ...editFormData, meal_options: updated });
                                            }}
                                        >
                                            <Ionicons
                                                name={editFormData.meal_options?.includes(meal) ? "checkmark-circle" : "ellipse-outline"}
                                                size={24}
                                                color={theme.colors.secondary}
                                            />
                                            <Text>{meal}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Staff Assignment */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Staff Assignment</Text>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                    onPress={() => setEditFormData({ ...editFormData, division_provides_coach: !editFormData.division_provides_coach })}
                                >
                                    <Ionicons
                                        name={editFormData.division_provides_coach ? "checkmark-circle" : "ellipse-outline"}
                                        size={24}
                                        color={theme.colors.secondary}
                                    />
                                    <Text>Division will provide coach</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                    onPress={() => setEditFormData({ ...editFormData, division_provides_ref: !editFormData.division_provides_ref })}
                                >
                                    <Ionicons
                                        name={editFormData.division_provides_ref ? "checkmark-circle" : "ellipse-outline"}
                                        size={24}
                                        color={theme.colors.secondary}
                                    />
                                    <Text>Division will provide ref</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.submitButton} onPress={handleUpdateEvent}>
                                <Text style={styles.submitButtonText}>Update Event</Text>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Helper Select Modals (shared: Add + Edit) */}
            <Modal
                visible={activeFormPicker?.kind === 'sport'}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setActiveFormPicker(null)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setActiveFormPicker(null)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Sport Type</Text>
                            <TouchableOpacity onPress={() => setActiveFormPicker(null)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {sportTypeOptions.map((sport) => {
                                const selected =
                                    activeFormPicker?.target === 'add'
                                        ? addFormData.sport_type === sport
                                        : editFormData.sport_type === sport;
                                return (
                                    <TouchableOpacity
                                        key={sport}
                                        style={styles.filterOption}
                                        onPress={() => {
                                            if (activeFormPicker?.target === 'add') {
                                                setAddFormData((p) => ({ ...p, sport_type: sport }));
                                            } else {
                                                setEditFormData((p) => ({ ...p, sport_type: sport }));
                                            }
                                            setActiveFormPicker(null);
                                        }}
                                    >
                                        <Text style={styles.filterOptionText}>{sport}</Text>
                                        {selected && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={activeFormPicker?.kind === 'event'}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setActiveFormPicker(null)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setActiveFormPicker(null)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Event Type</Text>
                            <TouchableOpacity onPress={() => setActiveFormPicker(null)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {eventTypeOptions.map((type) => {
                                const selected =
                                    activeFormPicker?.target === 'add'
                                        ? addFormData.event_type === type
                                        : editFormData.event_type === type;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={styles.filterOption}
                                        onPress={() => {
                                            if (activeFormPicker?.target === 'add') {
                                                setAddFormData((p) => ({ ...p, event_type: type }));
                                            } else {
                                                setEditFormData((p) => ({ ...p, event_type: type }));
                                            }
                                            setActiveFormPicker(null);
                                        }}
                                    >
                                        <Text style={styles.filterOptionText}>{type}</Text>
                                        {selected && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={activeFormPicker?.kind === 'home'}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setActiveFormPicker(null)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setActiveFormPicker(null)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Home/Away</Text>
                            <TouchableOpacity onPress={() => setActiveFormPicker(null)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {HOME_AWAY_OPTIONS.map((option) => {
                                const selected =
                                    activeFormPicker?.target === 'add'
                                        ? addFormData.home_away === option.value
                                        : editFormData.home_away === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={styles.filterOption}
                                        onPress={() => {
                                            if (activeFormPicker?.target === 'add') {
                                                setAddFormData((p) => ({ ...p, home_away: option.value }));
                                            } else {
                                                setEditFormData((p) => ({ ...p, home_away: option.value }));
                                            }
                                            setActiveFormPicker(null);
                                        }}
                                    >
                                        <Text style={styles.filterOptionText}>{option.label}</Text>
                                        {selected && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={activeFormPicker?.kind === 'divisions'}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setActiveFormPicker(null)}
            >
                <Pressable style={styles.filterModalOverlay} onPress={() => setActiveFormPicker(null)}>
                    <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Select Divisions</Text>
                            <TouchableOpacity onPress={() => setActiveFormPicker(null)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                <TouchableOpacity
                                    style={{ padding: 8, borderWidth: 1, borderRadius: 4 }}
                                    onPress={() => {
                                        const allIds = companyDivisions.map((d: any) => d.id);
                                        if (activeFormPicker?.target === 'add') {
                                            setAddFormData((p) => ({ ...p, division_ids: allIds }));
                                        } else {
                                            setEditFormData((p) => ({ ...p, division_ids: allIds }));
                                        }
                                    }}
                                >
                                    <Text>Select All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ padding: 8, borderWidth: 1, borderRadius: 4 }}
                                    onPress={() => {
                                        if (activeFormPicker?.target === 'add') {
                                            setAddFormData((p) => ({ ...p, division_ids: [] }));
                                        } else {
                                            setEditFormData((p) => ({ ...p, division_ids: [] }));
                                        }
                                    }}
                                >
                                    <Text>Deselect All</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView style={styles.filterModalScroll}>
                            {companyDivisions.map((div: any) => {
                                const ids =
                                    activeFormPicker?.target === 'add'
                                        ? addFormData.division_ids
                                        : editFormData.division_ids;
                                const isSelected = ids?.includes(div.id);
                                return (
                                    <TouchableOpacity
                                        key={div.id}
                                        style={styles.filterOption}
                                        onPress={() => {
                                            if (activeFormPicker?.target === 'add') {
                                                setAddFormData((p) => {
                                                    const current = p.division_ids || [];
                                                    const on = current.includes(div.id);
                                                    const updated = on
                                                        ? current.filter((id) => id !== div.id)
                                                        : [...current, div.id];
                                                    return { ...p, division_ids: updated };
                                                });
                                            } else {
                                                setEditFormData((p) => {
                                                    const current = p.division_ids || [];
                                                    const on = current.includes(div.id);
                                                    const updated = on
                                                        ? current.filter((id) => id !== div.id)
                                                        : [...current, div.id];
                                                    return { ...p, division_ids: updated };
                                                });
                                            }
                                        }}
                                    >
                                        <Text style={styles.filterOptionText}>{div.name}</Text>
                                        {isSelected && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
            {renderManageRosterModal()}
            {renderGuideModal()}

            {/* Event Options Modal */}
            <Modal
                visible={showEventOptionsModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEventOptionsModal(false)}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={() => setShowEventOptionsModal(false)}
                >
                    <Pressable
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 16,
                            width: '90%',
                            maxWidth: 380,
                            paddingBottom: 8,
                            overflow: 'hidden',
                        }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 16,
                            paddingBottom: 8,
                            paddingHorizontal: 20
                        }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>{selectedEventOptions?.title}</Text>
                            <TouchableOpacity onPress={() => setShowEventOptionsModal(false)}>
                                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 20 }}>
                            {/* Roster Count Card */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#FEF2F2',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 20
                            }}>
                                <View style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    backgroundColor: '#FEE2E2',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12
                                }}>
                                    <Ionicons name="people" size={24} color="#EF4444" />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 2 }}>Roster Count</Text>
                                    <Text style={{ fontSize: 24, fontWeight: '700', color: theme.colors.text }}>0</Text>
                                </View>
                            </View>

                            {/* Manage Roster Button */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#2563EB',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 14,
                                    borderRadius: 8,
                                    marginBottom: 12,
                                    gap: 8
                                }}
                                onPress={() => {
                                    setShowEventOptionsModal(false);
                                    setSelectedRosterEvent(selectedEventOptions);
                                    setShowManageRosterModal(true);
                                }}
                            >
                                <Ionicons name="people" size={20} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Manage Roster</Text>
                            </TouchableOpacity>

                            {/* Edit & Delete Row */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 14,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#E5E7EB',
                                        backgroundColor: 'white',
                                        gap: 8
                                    }}
                                    onPress={() => {
                                        setShowEventOptionsModal(false);
                                        handleEdit(selectedEventOptions);
                                    }}
                                >
                                    <Ionicons name="pencil" size={18} color={theme.colors.text} />
                                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>Edit Event</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 2,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 14,
                                        borderRadius: 8,
                                        backgroundColor: '#EF4444',
                                        gap: 8
                                    }}
                                    onPress={() => {
                                        setShowEventOptionsModal(false);
                                        handleDeleteClick(selectedEventOptions.id);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={18} color="white" />
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Delete Event</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {showDatePicker && Platform.OS === 'android' && datePickerContext && (
                <DateTimePicker
                    value={datePickerContext === 'add' ? addFormData.event_date : editFormData.event_date}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (event.type === 'dismissed') {
                            setDatePickerContext(null);
                            return;
                        }
                        if (selectedDate) {
                            if (datePickerContext === 'add') {
                                setAddFormData((p) => ({ ...p, event_date: selectedDate }));
                            } else {
                                setEditFormData((p) => ({ ...p, event_date: selectedDate }));
                            }
                        }
                        setDatePickerContext(null);
                    }}
                />
            )}
            {showDatePicker && Platform.OS === 'ios' && datePickerContext && (
                <Modal
                    transparent
                    animationType="slide"
                    visible={showDatePicker}
                    onRequestClose={() => {
                        setShowDatePicker(false);
                        setDatePickerContext(null);
                    }}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
                        <Pressable
                            style={{ flex: 1 }}
                            onPress={() => {
                                setShowDatePicker(false);
                                setDatePickerContext(null);
                            }}
                        />
                        <View
                            style={{
                                backgroundColor: '#fff',
                                borderTopLeftRadius: 14,
                                borderTopRightRadius: 14,
                                paddingBottom: 24,
                            }}
                        >
                            <DateTimePicker
                                value={datePickerContext === 'add' ? addFormData.event_date : editFormData.event_date}
                                mode="date"
                                display="spinner"
                                themeVariant="light"
                                onChange={(_, selectedDate) => {
                                    if (selectedDate) {
                                        if (datePickerContext === 'add') {
                                            setAddFormData((p) => ({ ...p, event_date: selectedDate }));
                                        } else {
                                            setEditFormData((p) => ({ ...p, event_date: selectedDate }));
                                        }
                                    }
                                }}
                            />
                            <TouchableOpacity
                                style={{ paddingVertical: 14, alignItems: 'center' }}
                                onPress={() => {
                                    setShowDatePicker(false);
                                    setDatePickerContext(null);
                                }}
                            >
                                <Text style={{ fontWeight: '600', fontSize: 16, color: theme.colors.secondary }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
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
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexWrap: 'wrap',
        marginTop: theme.spacing.md,
    },
    iconButton: {
        padding: theme.spacing.xs,
    },
    orangeIcon: {
        width: 40,
        height: 40,
        backgroundColor: theme.colors.accent,
        borderRadius: theme.borderRadius.md,
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
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    uploadBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 12,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    filterCard: {
        marginBottom: theme.spacing.md,
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
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        gap: theme.spacing.xs,
    },
    filterText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    calendarCard: {
        marginBottom: theme.spacing.md,
    },
    calendarNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    navButton: {
        fontSize: 14,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    navButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    monthYear: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
    },
    viewToggles: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    viewToggle: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    viewToggleActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    viewToggleText: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '600',
    },
    viewToggleTextActive: {
        color: 'white',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeader: {
        width: '14.28%',
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.xs,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    calendarDayOtherMonth: {
        backgroundColor: '#f9fafb',
    },
    calendarDaySelected: {
        backgroundColor: '#dbeafe',
        borderColor: theme.colors.secondary,
    },
    calendarDayToday: {
        borderWidth: 2,
        borderColor: theme.colors.secondary,
    },
    dayNumber: {
        fontSize: 12,
        color: theme.colors.text,
    },
    dayNumberOtherMonth: {
        color: theme.colors.textSecondary,
    },
    dayNumberSelected: {
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    eventIndicator: {
        marginTop: theme.spacing.xs,
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.secondary,
    },
    selectedDateEvents: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    selectedDateTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        marginBottom: theme.spacing.sm,
    },
    eventItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.sm,
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.xs,
    },
    eventItemContent: {
        flex: 1,
    },
    eventItemTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    eventItemDetails: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
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
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addEventModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '90%',
        maxWidth: 500,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
        ...theme.shadows.card,
    },
    addEventScroll: {
        paddingHorizontal: theme.spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
        marginBottom: theme.spacing.xs,
    },
    modalSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    formSection: {
        marginTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    inputField: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    addEventBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    addEventBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    pickerModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '60%',
        paddingBottom: theme.spacing.xl,
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
    // Guide Modal Styles
    guideModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    guideContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    guideSection: {
        paddingBottom: theme.spacing.xl,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    codeBox: {
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    codeText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: theme.colors.text,
    },
    importantNote: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
        marginBottom: theme.spacing.md,
    },
    tipsBox: {
        backgroundColor: '#fef3c7',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    tipsTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    tipItem: {
        ...theme.typography.bodySmall,
        fontSize: 13,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    // Bottom Sheet Styles
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '30%',
    },
    bottomSheetHeader: {
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
    bottomSheetOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },

    // Filter Modal Styles
    filterModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    filterModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '70%',
        paddingBottom: theme.spacing.xl,
    },
    filterModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filterModalTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    filterModalScroll: {
        maxHeight: 400,
    },
    filterOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filterOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },

    // List View Modal Styles
    listViewModal: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    listModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    listModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    listSearchInput: {
        flex: 1,
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: theme.spacing.sm,
    },
    filterContainer: {
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },

    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
    },
    filterButtonText: {
        ...theme.typography.body,
        fontSize: 13,
        color: theme.colors.text,
    },
    listViewContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    eventCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: '#fca5a5',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    eventCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xs,
    },
    eventTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        flex: 1,
    },
    eventActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    eventActionBtn: {
        padding: 4,
    },
    eventDate: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    eventTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: theme.spacing.sm,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'white',
    },
    eventFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventLocation: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    eventDescription: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    // Delete Confirmation Modal Styles
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '85%',
        maxWidth: 340,
    },
    deleteModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 8,
    },
    deleteModalMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: 8,
    },
    deleteModalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
    },
    deleteModalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    deleteModalConfirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#dc2626',
        alignItems: 'center',
    },
    deleteModalConfirmText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
    },
    cancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    // New Form Styles for Edit Modal
    formGroup: {
        marginBottom: theme.spacing.md,
    },
    label: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
    },
    selectInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    submitButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.lg,
    },
    submitButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});

