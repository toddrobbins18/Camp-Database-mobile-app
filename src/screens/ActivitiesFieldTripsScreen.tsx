import React, { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Switch, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { ModalPickerOverlay } from '../components/ModalPickerOverlay';
import { supabase } from '../lib/supabase';
import { notifyStaffAssignment } from '../lib/notifyStaffAssignment';
import { syncLinkedTripsFromFieldTrip } from '../lib/syncLinkedTripFromFieldTrip';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';
import * as DocumentPicker from 'expo-document-picker';
import { UnifiedCalendar, CalendarWidgetEvent } from '../components/UnifiedCalendar';

export const ActivitiesFieldTripsScreen = ({ navigation }: any) => {
    const ACTIVITY_TYPE_OPTIONS = [
        { value: 'field-trip', label: 'Field Trip' },
        { value: 'arts-crafts', label: 'Arts & Crafts' },
        { value: 'nature', label: 'Nature Activity' },
        { value: 'water', label: 'Water Activity' },
        { value: 'outdoor', label: 'Outdoor Adventure' },
        { value: 'cultural', label: 'Cultural Activity' },
        { value: 'staff-bus', label: 'Staff Bus' },
        { value: 'sporting-event', label: 'Sporting Event' },
        { value: 'other', label: 'Other' },
    ];
    const LOCATION_TYPE_OPTIONS = [
        { value: 'none', label: 'Not Specified' },
        { value: 'home', label: 'HOME' },
        { value: 'away', label: 'AWAY' },
    ];
    const MEAL_OPTIONS = ['Breakfast', 'Snack', 'Lunch', 'Dinner', 'Other'];
    const EMOJI_PRESETS = ["🚌", "🏕️", "🎨", "🌊", "⛺", "🎭", "🏆", "🎯", "🌲", "🎪", "🏊", "🚶"];

    const queryClient = useQueryClient();
    const { companyId, season } = useCompany();

    const invalidateActivityCaches = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['activities'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard_events'] });
        void queryClient.invalidateQueries({ queryKey: ['daily_news_schedule'] });
    }, [queryClient]);

    const toNullableString = (v: any) => {
        if (v == null) return null;
        const s = String(v).trim();
        return s.length ? s : null;
    };

    /** DB CHECK: home_away IN ('home','away') only — never send "", "none", etc. */
    const toHomeAway = (v: any): 'home' | 'away' | null => {
        const s = String(v ?? '').trim().toLowerCase();
        if (s === 'home' || s === 'away') return s;
        return null;
    };

    const formatSupabaseWriteError = (error: any): string => {
        const parts = [error?.message, error?.details, error?.hint].filter(Boolean);
        return parts.length ? parts.join('\n') : 'Request failed';
    };
    const shouldRetryWithoutEmoji = (error: any) => {
        const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return text.includes('emoji') && (text.includes('column') || text.includes('schema cache') || text.includes('not exist'));
    };

    const isIsoDateString = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());

    const buildSubmitData = (data: any) => {
        let capacity: number | null = null;
        if (data.capacity != null && String(data.capacity).trim() !== '') {
            const n = parseInt(String(data.capacity), 10);
            if (Number.isFinite(n) && n >= 0) capacity = n;
        }
        const mealList = Array.isArray(data.meal_options) ? data.meal_options.filter(Boolean) : [];
        // Postgres text[]: prefer null over [] for optional column (avoids some PostgREST edge cases).
        const meal_options = mealList.length ? mealList : null;

        const eventDate = String(data.event_date ?? '').trim();
        if (!isIsoDateString(eventDate)) {
            throw new Error('Event date must be in YYYY-MM-DD format. Re-pick the date from the calendar.');
        }
        const endRaw = data.is_multi_day ? toNullableString(data.end_date) : null;
        if (endRaw && !isIsoDateString(endRaw)) {
            throw new Error('End date must be in YYYY-MM-DD format. Re-pick the date from the calendar.');
        }

        return {
            event_date: eventDate,
            end_date: endRaw,
            is_multi_day: !!data.is_multi_day,
            title: String(data.title).trim(),
            description: toNullableString(data.description),
            activity_type: data.activity_type,
            emoji: toNullableString(data.emoji),
            depart_from_camp: toNullableString(data.depart_from_camp),
            depart_from_activity: toNullableString(data.depart_from_activity),
            location: toNullableString(data.location),
            capacity,
            chaperone: toNullableString(data.chaperone),
            home_away: toHomeAway(data.home_away),
            meal_options,
            meal_notes: toNullableString(data.meal_notes),
            season: selectedYear,
            company_id: companyId,
        };
    };

    const addActivityMutation = useMutation({
        mutationFn: async (newActivity: any) => {
            const { division_ids, ...activityData } = newActivity;
            const payload = buildSubmitData(activityData);

            // 1. Insert activity
            let { data: activity, error: activityError } = await supabase
                .from('activities_field_trips')
                .insert(payload)
                .select()
                .single();
            if (activityError && shouldRetryWithoutEmoji(activityError)) {
                const { emoji: _ignoreEmoji, ...fallbackPayload } = payload as any;
                const retry = await supabase
                    .from('activities_field_trips')
                    .insert(fallbackPayload)
                    .select()
                    .single();
                activity = retry.data as any;
                activityError = retry.error as any;
            }

            if (activityError) throw activityError;

            // 2. Insert division links
            if (division_ids && division_ids.length > 0) {
                const links = division_ids.map((divId: string) => ({
                    activity_id: activity.id,
                    division_id: divId,
                    company_id: companyId
                }));
                const { error: linksError } = await supabase
                    .from('activities_field_trips_divisions')
                    .insert(links);
                if (linksError) throw linksError;
            }
            const staffNames = (activityData.chaperone || '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
            if (staffNames.length > 0) {
                await notifyStaffAssignment({
                    staffNames,
                    eventTitle: activityData.title,
                    eventDate: activityData.event_date,
                    eventType: 'activity',
                    companyId,
                });
            }
            return activity;
        },
        onSuccess: () => {
            invalidateActivityCaches();
            Alert.alert('Success', 'Activity added successfully');
            closeActivityTransientUi();
            setIsAddActivityModalOpen(false);
            resetFormData();
        },
        onError: (error: any) => {
            console.error('activities_field_trips insert failed:', error);
            Alert.alert('Error', formatSupabaseWriteError(error) || 'Failed to add activity');
        }
    });

    const updateActivityMutation = useMutation({
        mutationFn: async (updatedActivity: any) => {
            const {
                id,
                division_ids,
                divisions: _,
                previous_title,
                previous_event_date,
                ...activityData
            } = updatedActivity;
            const payload = buildSubmitData(activityData);

            // 1. Update activity
            let { error: activityError } = await supabase
                .from('activities_field_trips')
                .update(payload)
                .eq('id', id);
            if (activityError && shouldRetryWithoutEmoji(activityError)) {
                const { emoji: _ignoreEmoji, ...fallbackPayload } = payload as any;
                const retry = await supabase
                    .from('activities_field_trips')
                    .update(fallbackPayload)
                    .eq('id', id);
                activityError = retry.error as any;
            }

            if (activityError) throw activityError;

            // 2. Update division links (Delete and Re-insert)
            const { error: deleteError } = await supabase
                .from('activities_field_trips_divisions')
                .delete()
                .eq('activity_id', id);

            if (deleteError) throw deleteError;

            if (division_ids && division_ids.length > 0) {
                const links = division_ids.map((divId: string) => ({
                    activity_id: id,
                    division_id: divId,
                    company_id: companyId
                }));
                const { error: linksError } = await supabase
                    .from('activities_field_trips_divisions')
                    .insert(links);
                if (linksError) throw linksError;
            }

            if (companyId && activityData.home_away !== 'home') {
                const { error: tripSyncError } = await syncLinkedTripsFromFieldTrip(
                    supabase,
                    {
                        field_trip_id: id,
                        company_id: companyId,
                        season: selectedYear,
                        previous_title: previous_title ?? activityData.title,
                        previous_date: previous_event_date ?? activityData.event_date,
                    },
                    {
                        title: activityData.title,
                        event_date: activityData.event_date,
                        end_date: activityData.end_date,
                        is_multi_day: activityData.is_multi_day,
                        depart_from_camp: activityData.depart_from_camp,
                        location: activityData.location,
                        activity_type: activityData.activity_type,
                        capacity: activityData.capacity ? parseInt(String(activityData.capacity), 10) : null,
                        chaperone: activityData.chaperone,
                    },
                );
                if (tripSyncError) {
                    console.warn('Linked trip sync:', tripSyncError);
                }
            }

            const staffNames = (activityData.chaperone || '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
            if (staffNames.length > 0) {
                await notifyStaffAssignment({
                    staffNames,
                    eventTitle: activityData.title,
                    eventDate: activityData.event_date,
                    eventType: 'activity',
                    companyId,
                });
            }
        },
        onSuccess: () => {
            invalidateActivityCaches();
            Alert.alert('Success', 'Activity updated successfully');
            closeActivityTransientUi();
            setIsEditModalOpen(false);
            setEditingActivity(null);
        },
        onError: (error: any) => {
            console.error('activities_field_trips update failed:', error);
            Alert.alert('Error', formatSupabaseWriteError(error) || 'Failed to update activity');
        }
    });

    const resetFormData = () => {
        const todayStr = formatDateForStorage(new Date());
        setFormData({
            title: '',
            event_date: todayStr,
            end_date: todayStr,
            is_multi_day: false,
            activity_type: '',
            emoji: '',
            home_away: '',
            division_ids: [],
            depart_from_camp: '',
            depart_from_activity: '',
            location: '',
            capacity: '',
            chaperone: '',
            description: '',
            meal_options: [],
            meal_notes: ''
        });
        setSelectedStaffIds([]);
        setStaffSearchQuery('');
    };

    const selectedYear = season || '2026';

    // Fetch divisions
    const { data: divisions = [] } = useQuery({
        queryKey: ['divisions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true);
            if (error) throw error;
            // Simplified sorting for now, can add sort_order logic later
            return data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        },
        enabled: !!companyId
    });
    const { data: staffData = [] } = useQuery({
        queryKey: ['staff', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('staff')
                .select('id, name, role')
                .eq('company_id', companyId)
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId
    });

    // Fetch activities and division associations
    const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
        queryKey: ['activities', companyId, selectedYear],
        queryFn: async () => {
            if (!companyId) return [];

            const [activitiesResult, linksResult, divisionsMetaResult] = await Promise.all([
                supabase
                    .from("activities_field_trips")
                    .select("*")
                    .eq('company_id', companyId)
                    .eq('season', selectedYear)
                    .order("event_date", { ascending: true })
                    .limit(2000),
                supabase
                    .from("activities_field_trips_divisions")
                    .select("activity_id, division_id")
                    .eq('company_id', companyId),
                supabase
                    .from('divisions')
                    .select('id, name, gender')
                    .eq('company_id', companyId)
            ]);

            if (activitiesResult.error) throw activitiesResult.error;
            const allActivities = activitiesResult.data || [];

            // Build a divisionId -> division meta lookup
            const divisionById: Record<string, any> = {};
            if (!divisionsMetaResult.error) {
                (divisionsMetaResult.data || []).forEach((d: any) => {
                    if (d?.id) divisionById[String(d.id)] = d;
                });
            }

            // Map division links to activities (normalize keys to string for reliable lookup)
            const divisionMap: Record<string, any[]> = {};
            const divisionLinks = linksResult.error ? [] : (linksResult.data || []);
            divisionLinks.forEach((link: any) => {
                const aid = link?.activity_id != null ? String(link.activity_id) : '';
                const did = link?.division_id != null ? String(link.division_id) : '';
                if (!aid || !did) return;
                if (!divisionMap[aid]) divisionMap[aid] = [];
                const meta = divisionById[did];
                divisionMap[aid].push(meta ? { id: meta.id, name: meta.name, gender: meta.gender } : { id: did, name: did, gender: null });
            });

            return allActivities.map(activity => ({
                ...activity,
                divisions: divisionMap[activity.id != null ? String(activity.id) : ''] || []
            }));
        },
        enabled: !!companyId
    });

    // Web subscribes to postgres_changes for this table; mobile uses React Query cache only.
    // Refetch when the screen is opened so rows added on web show up without restarting the app.
    useFocusEffect(
        useCallback(() => {
            invalidateActivityCaches();
        }, [invalidateActivityCaches])
    );

    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
    const seasonYear = parseInt(selectedYear, 10) || new Date().getFullYear();
    const [currentDate, setCurrentDate] = useState(new Date(seasonYear, 0, 22));
    const [sortBy, setSortBy] = useState<'date' | 'division'>('date');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [helpModalTab, setHelpModalTab] = useState<string>('Trips');
    const [isUploadCSVModalOpen, setIsUploadCSVModalOpen] = useState(false);
    const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
    const [isActivityTypeDropdownOpen, setIsActivityTypeDropdownOpen] = useState(false);
    const [isLocationTypeDropdownOpen, setIsLocationTypeDropdownOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [timePickerField, setTimePickerField] = useState<'depart_from_camp' | 'depart_from_activity' | null>(null);
    const [selectedTime, setSelectedTime] = useState({ hour: 0, minute: 0, ampm: 'AM' });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [datePickerField, setDatePickerField] = useState<'event_date' | 'end_date' | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const selectedStaff = useMemo(
        () => staffData.filter((staff: any) => selectedStaffIds.includes(staff.id)),
        [staffData, selectedStaffIds]
    );
    const filteredStaff = useMemo(() => {
        const q = staffSearchQuery.trim().toLowerCase();
        if (!q) return staffData;
        return staffData.filter((s: any) =>
            String(s.name || '').toLowerCase().includes(q) ||
            String(s.role || '').toLowerCase().includes(q)
        );
    }, [staffData, staffSearchQuery]);
    const toggleStaffSelection = (staffId: string) => {
        setSelectedStaffIds((prev) =>
            prev.includes(staffId)
                ? prev.filter((id) => id !== staffId)
                : [...prev, staffId]
        );
    };
    const closeActivityTransientUi = () => {
        setIsActivityTypeDropdownOpen(false);
        setIsLocationTypeDropdownOpen(false);
        setIsDatePickerOpen(false);
        setDatePickerField(null);
        setIsTimePickerOpen(false);
        setTimePickerField(null);
    };
    const [formData, setFormData] = useState({
        event_date: '',
        end_date: '',
        is_multi_day: false,
        title: '',
        activity_type: '',
        emoji: '',
        home_away: '',
        division_ids: [] as string[],
        depart_from_camp: '',
        depart_from_activity: '',
        location: '',
        capacity: '',
        chaperone: '',
        description: '',
        meal_options: [] as string[],
        meal_notes: '',
    });
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvUploadError, setCsvUploadError] = useState<string | null>(null);

    const handleDeleteActivity = async () => {
        if (!activityToDelete?.id) {
            console.log('[DELETE] Aborted: missing activity id');
            Alert.alert('Delete failed', 'Cannot delete: missing activity id');
            return;
        }
        const id = activityToDelete.id;
        setIsDeleting(true);
        try {
            console.log('[DELETE] Starting delete for activity:', id);
            const { error, status, statusText } = await supabase
                .from('activities_field_trips')
                .delete()
                .eq('id', id);

            console.log('[DELETE] Response:', { error, status, statusText });

            if (error) {
                console.error('[DELETE] Supabase error:', error);
                Alert.alert('Delete failed', error.message || 'Unknown error');
            } else {
                console.log('[DELETE] Success — invalidating queries');
                invalidateActivityCaches();
                Alert.alert('Success', 'Activity deleted successfully');
            }
        } catch (err: any) {
            console.error('[DELETE] Exception:', err);
            Alert.alert('Delete failed', err?.message || 'Unexpected error');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setActivityToDelete(null);
        }
    };

    // Parse CSV text into rows of objects (first line = headers)
    const parseCSV = (text: string): Record<string, string>[] => {
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.replace(/^"|"$/g, '').trim());
            const row: Record<string, string> = {};
            headers.forEach((h, j) => { row[h] = values[j] ?? ''; });
            rows.push(row);
        }
        return rows;
    };

    // Build activity payload from CSV row (match buildSubmitData + division_ids)
    const csvRowToActivity = (row: Record<string, string>) => {
        const raw = row.meal_options?.trim();
        let meal_options: string[] = [];
        if (raw) {
            try {
                meal_options = JSON.parse(raw) as string[];
            } catch {
                meal_options = raw.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
            }
        }
        let division_ids: string[] = [];
        const divRaw = row.division_ids?.trim();
        if (divRaw) {
            try {
                division_ids = JSON.parse(divRaw) as string[];
            } catch {
                division_ids = divRaw.replace(/^\[|\]$/g, '').split(',').map((s) => String(s).trim()).filter(Boolean);
            }
        }
        return {
            event_date: row.event_date?.trim() || null,
            end_date: row.end_date?.trim() || null,
            is_multi_day: /^(true|1|yes)$/i.test(row.is_multi_day?.trim() ?? ''),
            title: row.title?.trim() || '',
            activity_type: row.activity_type?.trim() || '',
            home_away: row.home_away?.trim() || null,
            division_ids,
            depart_from_camp: row.depart_from_camp?.trim() || null,
            depart_from_activity: row.depart_from_activity?.trim() || null,
            location: row.location?.trim() || null,
            capacity: row.capacity?.trim() || '',
            chaperone: row.chaperone?.trim() || null,
            description: row.description?.trim() || null,
            meal_options,
            meal_notes: null,
        };
    };

    const handleUploadCSV = async () => {
        if (!companyId) {
            setCsvUploadError('No company selected');
            return;
        }
        setCsvUploadError(null);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
                copyToCacheDirectory: true,
            });
            const asset = result.assets?.[0];
            if (!asset?.uri) {
                return;
            }
            setCsvUploading(true);
            const response = await fetch(asset.uri);
            const text = await response.text();
            const rows = parseCSV(text);
            if (rows.length === 0) {
                setCsvUploadError('CSV has no data rows (need header + at least one row)');
                setCsvUploading(false);
                return;
            }
            if (rows.length > 1000) {
                setCsvUploadError('Maximum 1000 rows per upload');
                setCsvUploading(false);
                return;
            }
            let inserted = 0;
            const errors: string[] = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const activityData = csvRowToActivity(row);
                if (!activityData.title?.trim() || !activityData.event_date?.trim()) {
                    errors.push(`Row ${i + 2}: title and event_date required`);
                    continue;
                }
                try {
                    const { division_ids, ...rest } = activityData;
                    const payload = buildSubmitData(rest);
                    const { data: activity, error: activityError } = await supabase
                        .from('activities_field_trips')
                        .insert(payload)
                        .select()
                        .single();
                    if (activityError) {
                        errors.push(`Row ${i + 2}: ${activityError.message}`);
                        continue;
                    }
                    if (division_ids && division_ids.length > 0) {
                        const links = division_ids.map((divId: string) => ({
                            activity_id: activity.id,
                            division_id: divId,
                            company_id: companyId,
                        }));
                        const { error: linksError } = await supabase
                            .from('activities_field_trips_divisions')
                            .insert(links);
                        if (linksError) errors.push(`Row ${i + 2} divisions: ${linksError.message}`);
                    }
                    inserted++;
                } catch (e: any) {
                    errors.push(`Row ${i + 2}: ${e?.message || String(e)}`);
                }
            }
            invalidateActivityCaches();
            setIsUploadCSVModalOpen(false);
            setCsvUploading(false);
            if (inserted > 0) {
                Alert.alert('Upload complete', `Inserted ${inserted} activity(ies).${errors.length ? ` ${errors.length} row(s) had errors.` : ''}`);
            } else {
                Alert.alert('Upload failed', errors.slice(0, 5).join('\n') || 'No rows could be inserted.');
            }
        } catch (e: any) {
            setCsvUploading(false);
            setCsvUploadError(e?.message || 'Failed to pick or read file');
        }
    };








    // Format date for activity cards (match web: "Wed, Jul 8" or "Jul 28 - Jul 29, 2026")
    const formatActivityDate = (startDate: string, endDate?: string, isMultiDay?: boolean) => {
        const start = new Date(startDate + 'T00:00:00');
        if (isMultiDay && endDate) {
            const end = new Date(endDate + 'T00:00:00');
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // Format time for display (12-hour format)
    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        if (timeString.toUpperCase().includes('AM') || timeString.toUpperCase().includes('PM')) {
            return timeString.toUpperCase();
        }
        if (timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours, 10);
            const minute = parseInt(minutes, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
        }
        return timeString;
    };

    // Parse time from 12-hour format to 24-hour format
    const parseTimeTo24Hour = (hour: number, minute: number, ampm: string) => {
        let hour24 = hour;
        if (ampm === 'PM' && hour !== 12) {
            hour24 = hour + 12;
        } else if (ampm === 'AM' && hour === 12) {
            hour24 = 0;
        }
        return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    // Format date for display (MM/DD/YYYY)
    const formatDateForDisplay = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // Format date for storage (YYYY-MM-DD)
    const formatDateForStorage = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Open time picker
    const openTimePicker = (field: 'depart_from_camp' | 'depart_from_activity') => {
        setIsActivityTypeDropdownOpen(false);
        setIsLocationTypeDropdownOpen(false);
        setIsDatePickerOpen(false);
        setDatePickerField(null);
        setTimePickerField(field);
        // Parse existing time if available
        const currentTime = formData[field];
        if (currentTime) {
            const [hours, minutes] = currentTime.split(':');
            const hour = parseInt(hours);
            const hour12 = hour % 12 || 12;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            setSelectedTime({ hour: hour12, minute: parseInt(minutes), ampm });
        } else {
            setSelectedTime({ hour: 12, minute: 0, ampm: 'AM' });
        }
        setIsTimePickerOpen(true);
    };

    // Confirm time selection
    const confirmTimeSelection = () => {
        if (timePickerField) {
            const time24 = parseTimeTo24Hour(selectedTime.hour, selectedTime.minute, selectedTime.ampm);
            setFormData({ ...formData, [timePickerField]: time24 });
        }
        setIsTimePickerOpen(false);
        setTimePickerField(null);
    };

    // Calculate number of days for multi-day events
    const calculateDays = (startDate: string, endDate: string) => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const filteredActivities = useMemo(() =>
        activities.filter(activity => {
            if (selectedDivision === 'All Divisions') return true;
            return activity.divisions?.some((div: any) => div.name === selectedDivision);
        }),
        [activities, selectedDivision]
    );

    const calendarWidgetEvents: CalendarWidgetEvent[] = useMemo(() =>
        filteredActivities.map((act) => ({
            id: act.id,
            title: act.title || '',
            date: new Date((act.event_date) + 'T00:00:00'),
            time: act.depart_from_camp || '',
            location: act.location || '',
            type: 'field-trip',
            accent: { bg: '#dcfce7', text: '#166534', marker: '#16a34a' },
        })),
        [filteredActivities]
    );

    const groupActivitiesByMonth = () => {
        const grouped: Record<string, any[]> = {};
        filteredActivities.forEach(activity => {
            const date = new Date(activity.event_date + 'T00:00:00');
            const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            grouped[monthKey].push(activity);
        });
        return grouped;
    };

    const groupedActivities = groupActivitiesByMonth();

    /** In-modal bottom sheet overlay; avoids stacked RN Modal touch issues on iOS. */
    const renderActivitySelectOverlay = () => {
        const isVisible = isActivityTypeDropdownOpen || isLocationTypeDropdownOpen;
        const title = isLocationTypeDropdownOpen ? 'Select Location Type' : 'Select Type';

        const options: { value: string, label: string }[] = isLocationTypeDropdownOpen
            ? LOCATION_TYPE_OPTIONS
            : ACTIVITY_TYPE_OPTIONS;
        const currentValue = isLocationTypeDropdownOpen
            ? (formData.home_away || 'none')
            : formData.activity_type;
        const onSelect = (val: string) => {
            if (isLocationTypeDropdownOpen) {
                setFormData({ ...formData, home_away: val === 'none' ? '' : val });
            } else {
                setFormData({ ...formData, activity_type: val });
            }
        };

        return (
            <ModalPickerOverlay
                visible={isVisible}
                onClose={() => {
                    setIsActivityTypeDropdownOpen(false);
                }}
                title={title}
            >
                <ScrollView
                    style={{ maxHeight: 320 }}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.activityTypePickerList}
                >
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.label}
                            style={[
                                styles.bottomSheetOption,
                                currentValue === option.value && styles.bottomSheetOptionSelected
                            ]}
                            onPress={() => {
                                onSelect(option.value);
                                setIsActivityTypeDropdownOpen(false);
                                setIsLocationTypeDropdownOpen(false);
                            }}
                        >
                            <Text style={[
                                styles.bottomSheetOptionText,
                                currentValue === option.value && styles.bottomSheetOptionTextSelected
                            ]}>
                                {option.label}
                            </Text>
                            {currentValue === option.value && (
                                <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ModalPickerOverlay>
        );
    };

    /** In-modal time picker — avoid stacking a second RN Modal on iOS (does not open reliably). */
    const renderTimePickerOverlay = () => (
        <ModalPickerOverlay
            visible={isTimePickerOpen}
            onClose={() => {
                setIsTimePickerOpen(false);
                setTimePickerField(null);
            }}
            title="Select Time"
        >
            <View style={styles.timePickerContent}>
                <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Hour</Text>
                    <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <TouchableOpacity
                                key={hour}
                                style={[
                                    styles.timePickerOption,
                                    selectedTime.hour === hour && styles.timePickerOptionSelected
                                ]}
                                onPress={() => setSelectedTime({ ...selectedTime, hour })}
                            >
                                <Text style={[
                                    styles.timePickerOptionText,
                                    selectedTime.hour === hour && styles.timePickerOptionTextSelected
                                ]}>
                                    {hour}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Minute</Text>
                    <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                            <TouchableOpacity
                                key={minute}
                                style={[
                                    styles.timePickerOption,
                                    selectedTime.minute === minute && styles.timePickerOptionSelected
                                ]}
                                onPress={() => setSelectedTime({ ...selectedTime, minute })}
                            >
                                <Text style={[
                                    styles.timePickerOptionText,
                                    selectedTime.minute === minute && styles.timePickerOptionTextSelected
                                ]}>
                                    {minute.toString().padStart(2, '0')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Period</Text>
                    <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {['AM', 'PM'].map((period) => (
                            <TouchableOpacity
                                key={period}
                                style={[
                                    styles.timePickerOption,
                                    selectedTime.ampm === period && styles.timePickerOptionSelected
                                ]}
                                onPress={() => setSelectedTime({ ...selectedTime, ampm: period })}
                            >
                                <Text style={[
                                    styles.timePickerOptionText,
                                    selectedTime.ampm === period && styles.timePickerOptionTextSelected
                                ]}>
                                    {period}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
            <View style={styles.timePickerDisplay}>
                <Text style={styles.timePickerDisplayText}>
                    {selectedTime.hour}:{selectedTime.minute.toString().padStart(2, '0')} {selectedTime.ampm}
                </Text>
            </View>
            <View style={styles.timePickerActions}>
                <TouchableOpacity
                    style={styles.timePickerCancelButton}
                    onPress={() => {
                        setIsTimePickerOpen(false);
                        setTimePickerField(null);
                    }}
                >
                    <Text style={styles.timePickerCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timePickerConfirmButton} onPress={confirmTimeSelection}>
                    <Text style={styles.timePickerConfirmButtonText}>Confirm</Text>
                </TouchableOpacity>
            </View>
        </ModalPickerOverlay>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.headerTitleContainer}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="leaf" size={24} color={theme.colors.primary} />
                        <Text style={styles.headerTitle}>Activities & Field Trips</Text>
                    </View>
                    <Text style={styles.headerSubtitle}>Schedule and manage activities and field trips for The Nest.</Text>
                </View>
            </View>



            <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Controls Bar */}
                <View style={styles.controlsBar}>
                    {/* Row 1: Filters + View Toggle */}
                    <View style={styles.controlsTopRow}>
                        <View style={styles.controlsLeft}>
                            <View style={styles.divisionFilterContainer}>
                                <TouchableOpacity
                                    style={styles.divisionDropdown}
                                    onPress={() => setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
                                >
                                    <Text style={styles.divisionText}>{selectedDivision}</Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {viewMode === 'list' && (
                                <TouchableOpacity
                                    style={styles.sortButton}
                                    onPress={() => setSortBy(sortBy === 'date' ? 'division' : 'date')}
                                >
                                    <Text style={styles.sortButtonText}>
                                        Sort by {sortBy === 'date' ? 'Division' : 'Date'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.controlsRight}>
                            <View style={styles.viewToggle}>
                                <TouchableOpacity
                                    style={[
                                        styles.viewToggleButton,
                                        viewMode === 'calendar' && styles.viewToggleButtonActive
                                    ]}
                                    onPress={() => setViewMode('calendar')}
                                >
                                    <Ionicons
                                        name="calendar"
                                        size={20}
                                        color={viewMode === 'calendar' ? theme.colors.surface : theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.viewToggleButton,
                                        viewMode === 'list' && styles.viewToggleButtonActive
                                    ]}
                                    onPress={() => setViewMode('list')}
                                >
                                    <Ionicons
                                        name="list"
                                        size={20}
                                        color={viewMode === 'list' ? theme.colors.surface : theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => setIsHelpModalOpen(true)}
                            >
                                <Ionicons name="help-circle-outline" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Row 2: Action Buttons */}
                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={() => { setCsvUploadError(null); setIsUploadCSVModalOpen(true); }}
                        >
                            <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.surface} />
                            <Text style={styles.uploadButtonText}>Upload CSV</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => {
                                setEditingActivity(null);
                                resetFormData();
                                setIsAddActivityModalOpen(true);
                                setIsActivityTypeDropdownOpen(false);
                                setIsLocationTypeDropdownOpen(false);
                            }}
                        >
                            <Ionicons name="add" size={18} color={theme.colors.surface} />
                            <Text style={styles.addButtonText}>Add Activity</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <UnifiedCalendar
                        events={calendarWidgetEvents}
                        currentDate={currentDate}
                        onCurrentDateChange={setCurrentDate}
                        selectedDate={selectedDate}
                        onSelectedDateChange={setSelectedDate}
                        onEventPress={(evt) => {
                            const activity = filteredActivities.find((a) => a.id === evt.id);
                            if (activity) {
                                setEditingActivity(activity);
                                setFormData({
                                    event_date: activity.event_date,
                                    end_date: activity.end_date || '',
                                    is_multi_day: activity.is_multi_day || false,
                                    title: activity.title,
                                    activity_type: activity.activity_type,
                                    emoji: activity.emoji || '',
                                    home_away: activity.home_away || '',
                                    division_ids: activity.divisions?.map((d: any) => d.id) || [],
                                    depart_from_camp: activity.depart_from_camp || '',
                                    depart_from_activity: activity.depart_from_activity || '',
                                    location: activity.location || '',
                                    capacity: activity.capacity ? String(activity.capacity) : '',
                                    chaperone: activity.chaperone || '',
                                    description: activity.description || '',
                                    meal_options: activity.meal_options || [],
                                    meal_notes: activity.meal_notes || '',
                                });
                                const chaperoneNames = (activity.chaperone || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                                const matchedIds = staffData.filter((staff: any) => chaperoneNames.includes(staff.name)).map((staff: any) => staff.id);
                                setSelectedStaffIds(matchedIds);
                                setStaffSearchQuery('');
                                setIsEditModalOpen(true);
                            }
                        }}
                        views={['Month', 'Week', 'Day', 'Agenda']}
                        initialView={'Month'}
                        showZoom={true}
                        showNavigation={true}
                    />
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <View style={styles.listViewContainer}>
                        {Object.entries(groupedActivities).map(([month, activities]) => (
                            <View key={month} style={styles.monthGroup}>
                                <Text style={styles.monthHeader}>{month}</Text>
                                <View style={styles.activitiesList}>
                                    {activities.map((activity) => (
                                        <StyledCard key={activity.id} style={styles.activityCard}>
                                            <View style={styles.activityCardHeader}>
                                                <View style={styles.activityCardTitleContainer}>
                                                    <Text style={styles.activityCardTitle}>
                                                        {activity.title}
                                                    </Text>
                                                    <Text style={styles.activityCardDate}>
                                                        {formatActivityDate(
                                                            activity.event_date,
                                                            activity.end_date,
                                                            activity.is_multi_day
                                                        )}
                                                    </Text>
                                                </View>
                                                <View style={styles.activityCardActions}>
                                                    <Pressable
                                                        style={({ pressed }) => [
                                                            styles.actionIconButton,
                                                            pressed && styles.actionIconButtonPressed
                                                        ]}
                                                        onPress={() => {
                                                            setEditingActivity(activity);
                                                            setFormData({
                                                                event_date: activity.event_date,
                                                                end_date: activity.end_date || '',
                                                                is_multi_day: activity.is_multi_day || false,
                                                                title: activity.title,
                                                                activity_type: activity.activity_type,
                                                                emoji: activity.emoji || '',
                                                                home_away: activity.home_away || '',
                                                                division_ids: activity.divisions?.map((d: any) => d.id) || [],
                                                                depart_from_camp: activity.depart_from_camp || '',
                                                                depart_from_activity: activity.depart_from_activity || '',
                                                                location: activity.location || '',
                                                                capacity: activity.capacity?.toString() || '',
                                                                chaperone: activity.chaperone || '',
                                                                description: activity.description || '',
                                                                meal_options: activity.meal_options || [],
                                                                meal_notes: activity.meal_notes || '',
                                                            });
                                                            const chaperoneNames = (activity.chaperone || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                                                            const matchedIds = staffData.filter((staff: any) => chaperoneNames.includes(staff.name)).map((staff: any) => staff.id);
                                                            setSelectedStaffIds(matchedIds);
                                                            setStaffSearchQuery('');
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
                                                    </Pressable>
                                                    <TouchableOpacity
                                                        style={styles.actionIconButton}
                                                        onPress={() => {
                                                            setActivityToDelete(activity);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View style={styles.activityCardBadges}>
                                                <View style={[styles.badge, styles.badgeType]}>
                                                    <Text style={styles.badgeTypeText}>
                                                        {activity.activity_type || 'other'}
                                                    </Text>
                                                </View>
                                                {activity.is_multi_day && activity.end_date && (
                                                    <View style={[styles.badge, styles.badgeMultiDay]}>
                                                        <Ionicons name="calendar-outline" size={12} color="#0d9488" />
                                                        <Text style={styles.badgeMultiDayText}>
                                                            {calculateDays(activity.event_date, activity.end_date)}-Day
                                                        </Text>
                                                    </View>
                                                )}
                                                {activity.home_away && (
                                                    <View style={[styles.badge, styles.badgeOutline]}>
                                                        <Text style={[styles.badgeText, styles.badgeTextOutline]}>
                                                            {activity.home_away.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                {(activity.divisions ?? []).map((div: any, idx: number) => (
                                                    <View key={div.id ?? div.name ?? `div-${idx}`} style={[styles.badge, styles.badgeDivision]}>
                                                        <Text style={styles.badgeDivisionText}>{div.name ?? String(div.id ?? '')}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                            <View style={styles.activityCardDetailRow}>
                                                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
                                                <Text style={styles.activityCardDetailText}>
                                                    {(activity.depart_from_camp || activity.depart_from_activity)
                                                        ? (activity.depart_from_camp && `Depart: ${formatTime(activity.depart_from_camp)}`) +
                                                            (activity.depart_from_camp && activity.depart_from_activity ? ' | ' : '') +
                                                            (activity.depart_from_activity ? `Return: ${formatTime(activity.depart_from_activity)}` : '')
                                                        : 'Timing TBD. Will update asap.'}
                                                </Text>
                                            </View>
                                            {activity.location ? (
                                                <View style={styles.activityCardDetailRow}>
                                                    <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
                                                    <Text style={styles.activityCardDetailText}>{activity.location}</Text>
                                                </View>
                                            ) : null}
                                            {activity.capacity != null && activity.capacity !== '' ? (
                                                <View style={styles.activityCardDetailRow}>
                                                    <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
                                                    <Text style={styles.activityCardDetailText}>Capacity: {activity.capacity}</Text>
                                                </View>
                                            ) : null}
                                            {activity.chaperone ? (
                                                <View style={styles.activityCardDetailRow}>
                                                    <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
                                                    <Text style={styles.activityCardDetailText}>Staff: {activity.chaperone}</Text>
                                                </View>
                                            ) : null}
                                            {activity.description ? (
                                                <Text style={styles.activityCardNotes} numberOfLines={3}>{activity.description}</Text>
                                            ) : null}
                                        </StyledCard>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

            </KeyboardAwareScrollView>

            {/* Division Dropdown Modal - Bottom Sheet */}
            <Modal
                visible={isDivisionDropdownOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsDivisionDropdownOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setIsDivisionDropdownOpen(false)}
                >
                    <Pressable
                        style={styles.divisionBottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Bottom Sheet Header */}
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Division</Text>
                        </View>

                        {/* Bottom Sheet Options */}
                        <View style={styles.bottomSheetContent}>
                            <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
                                style={styles.divisionBottomSheetScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                {[{ id: 'all', name: 'All Divisions' }, ...divisions].map((division) => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            selectedDivision === division.name && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedDivision(division.name);
                                            setIsDivisionDropdownOpen(false);
                                        }}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={selectedDivision === division.name ? theme.colors.surface : theme.colors.secondary}
                                        />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedDivision === division.name && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </KeyboardAwareScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Upload CSV Bottom Sheet Modal */}
            <Modal
                visible={isUploadCSVModalOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => !csvUploading && setIsUploadCSVModalOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => !csvUploading && setIsUploadCSVModalOpen(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Upload activities CSV</Text>
                        </View>
                        <View style={styles.bottomSheetContent}>
                            {csvUploadError ? (
                                <Text style={[styles.helpModalBullet, { color: theme.colors.danger, marginBottom: 12 }]}>{csvUploadError}</Text>
                            ) : null}
                            <TouchableOpacity
                                style={[styles.bottomSheetOption, csvUploading && { opacity: 0.7 }]}
                                onPress={handleUploadCSV}
                                disabled={csvUploading}
                            >
                                {csvUploading ? (
                                    <ActivityIndicator size="small" color={theme.colors.secondary} style={{ marginRight: 8 }} />
                                ) : (
                                    <Ionicons name="document-attach-outline" size={24} color={theme.colors.secondary} />
                                )}
                                <Text style={styles.bottomSheetOptionText}>
                                    {csvUploading ? 'Uploading…' : 'Choose CSV file'}
                                </Text>
                            </TouchableOpacity>
                            <Text style={[styles.helpModalBullet, { marginTop: 8, fontSize: 12 }]}>
                                Columns: title, event_date, end_date, is_multi_day, activity_type, home_away, division_ids, depart_from_camp, depart_from_activity, location, capacity, chaperone, description, meal_options. Max 1000 rows.
                            </Text>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Add Activity Bottom Sheet Modal */}
            <Modal
                visible={isAddActivityModalOpen}
                transparent={true}
                animationType="fade"
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                onRequestClose={() => {
                    closeActivityTransientUi();
                    setIsAddActivityModalOpen(false);
                }}
            >
                <View style={{ flex: 1 }}>
                <Pressable
                    style={styles.centeredOverlay}
                    onPress={() => {
                        closeActivityTransientUi();
                        setIsAddActivityModalOpen(false);
                    }}
                >
                    <Pressable
                        style={styles.centeredModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="always"
                            style={styles.addActivityBottomSheetScroll}
                            contentContainerStyle={styles.addActivityBottomSheetContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Modal Header */}
                            <View style={styles.addActivityBottomSheetHeader}>
                                <Text style={styles.addActivityBottomSheetTitle}>Add New Trip</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        closeActivityTransientUi();
                                        setIsAddActivityModalOpen(false);
                                    }}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Form Content - Reuse the edit form structure */}
                            <View style={styles.addActivityFormContent}>
                                {/* Multi-Day Toggle (match edit/web) */}
                                <View style={styles.multiDayToggle}>
                                    <View style={styles.multiDayToggleContent}>
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                                        <View style={styles.multiDayToggleText}>
                                            <Text style={styles.multiDayToggleLabel}>Multi-Day Trip</Text>
                                            <Text style={styles.multiDayToggleDescription}>
                                                Enable this for events spanning multiple days
                                            </Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={formData.is_multi_day}
                                        onValueChange={(checked) => {
                                            setFormData({
                                                ...formData,
                                                is_multi_day: checked,
                                                end_date: checked ? formData.end_date : '',
                                            });
                                        }}
                                    />
                                </View>

                                {/* Date Fields */}
                                <View style={formData.is_multi_day ? styles.dateFieldsRow : {}}>
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>
                                            {formData.is_multi_day ? 'Start Date' : 'Event Date'}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.dateInputContainer}
                                            onPress={() => {
                                                const current = formData.event_date
                                                    ? new Date(formData.event_date + 'T00:00:00')
                                                    : new Date();
                                                setSelectedDate(current);
                                                setDatePickerField('event_date');
                                                setIsDatePickerOpen(true);
                                            }}
                                        >
                                            <Text style={[styles.dateInputText, !formData.event_date && styles.dateInputPlaceholder]}>
                                                {formData.event_date ? formatDateForDisplay(formData.event_date) : 'mm/dd/yyyy'}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    {formData.is_multi_day && (
                                        <View style={styles.formField}>
                                            <Text style={styles.formLabel}>End Date</Text>
                                            <TouchableOpacity
                                                style={styles.dateInputContainer}
                                                onPress={() => {
                                                    const current = formData.end_date
                                                        ? new Date(formData.end_date + 'T00:00:00')
                                                        : new Date();
                                                    setSelectedDate(current);
                                                    setDatePickerField('end_date');
                                                    setIsDatePickerOpen(true);
                                                }}
                                            >
                                                <Text style={[styles.dateInputText, !formData.end_date && styles.dateInputPlaceholder]}>
                                                    {formData.end_date ? formatDateForDisplay(formData.end_date) : 'mm/dd/yyyy'}
                                                </Text>
                                                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Duration Badge */}
                                {formData.is_multi_day && formData.event_date && formData.end_date && (
                                    <View style={[styles.badge, styles.badgePrimary, styles.durationBadge]}>
                                        <Text style={styles.badgeText}>
                                            {calculateDays(formData.event_date, formData.end_date)}-Day Event
                                        </Text>
                                    </View>
                                )}

                                {/* Title */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Trip Name *</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={formData.title}
                                        onChangeText={(text) => setFormData({ ...formData, title: text })}
                                        placeholder="e.g., Science Museum Visit"
                                    />
                                </View>
                                <Text style={styles.tripNameHelpText}>Descriptive name for this trip or event</Text>

                                {/* Activity Type */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Type *</Text>
                                    <View style={styles.dropdownContainer}>
                                        <TouchableOpacity
                                            style={styles.formInput}
                                            onPress={() => {
                                                setIsActivityTypeDropdownOpen(true);
                                                setIsLocationTypeDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={formData.activity_type ? styles.formInputText : styles.formInputPlaceholder}>
                                                {formData.activity_type
                                                    ? formData.activity_type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                                    : 'Select type'}
                                            </Text>
                                            <Ionicons
                                                name={isActivityTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                                                size={20}
                                                color={theme.colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Emoji Icon (optional)</Text>
                                    <TextInput
                                        style={styles.formTextInput}
                                        value={formData.emoji}
                                        onChangeText={(text) => setFormData({ ...formData, emoji: text })}
                                        placeholder="Paste an emoji e.g. 🚌 🏕️ 🎨"
                                        maxLength={4}
                                    />
                                    <View style={styles.emojiPresetsRow}>
                                        {EMOJI_PRESETS.map((emoji) => (
                                            <TouchableOpacity
                                                key={emoji}
                                                style={[styles.emojiPresetButton, formData.emoji === emoji && styles.emojiPresetButtonSelected]}
                                                onPress={() => setFormData({ ...formData, emoji: formData.emoji === emoji ? '' : emoji })}
                                            >
                                                <Text style={styles.emojiPresetText}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Location Type</Text>
                                    <View style={styles.dropdownContainer}>
                                        <TouchableOpacity
                                            style={styles.formInput}
                                            onPress={() => {
                                                setIsLocationTypeDropdownOpen(true);
                                                setIsActivityTypeDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={formData.home_away ? styles.formInputText : styles.formInputPlaceholder}>
                                                {formData.home_away ? formData.home_away.toUpperCase() : 'Not Specified'}
                                            </Text>
                                            <Ionicons
                                                name={isLocationTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                                                size={20}
                                                color={theme.colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.formField}>
                                    <View style={styles.divisionsHeader}>
                                        <Text style={styles.formLabel}>Divisions</Text>
                                        <View style={styles.divisionsActions}>
                                            <TouchableOpacity style={styles.selectAllButton} onPress={() => setFormData({ ...formData, division_ids: divisions.map((d: any) => d.id) })}>
                                                <Text style={styles.selectAllButtonText}>Select All</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.selectAllButton} onPress={() => setFormData({ ...formData, division_ids: [] })}>
                                                <Text style={styles.selectAllButtonText}>Clear</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={styles.divisionsList}>
                                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                            {divisions.map((division: any) => {
                                                const isSelected = formData.division_ids.includes(division.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={division.id}
                                                        style={styles.divisionCheckbox}
                                                        onPress={() => {
                                                            setFormData({
                                                                ...formData,
                                                                division_ids: isSelected
                                                                    ? formData.division_ids.filter((id) => id !== division.id)
                                                                    : [...formData.division_ids, division.id]
                                                            });
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name={isSelected ? 'checkbox' : 'square-outline'}
                                                            size={18}
                                                            color={isSelected ? theme.colors.secondary : theme.colors.textSecondary}
                                                        />
                                                        <Text style={styles.divisionCheckboxText}>{division.name}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                </View>


                                {/* Optional Fields */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Departure Time</Text>
                                    <TouchableOpacity style={styles.formInput} onPress={() => openTimePicker('depart_from_camp')}>
                                        <Text style={formData.depart_from_camp ? styles.formInputText : styles.formInputPlaceholder}>
                                            {formData.depart_from_camp ? formatTime(formData.depart_from_camp) : '--:-- --'}
                                        </Text>
                                        <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Return Time</Text>
                                    <TouchableOpacity style={styles.formInput} onPress={() => openTimePicker('depart_from_activity')}>
                                        <Text style={formData.depart_from_activity ? styles.formInputText : styles.formInputPlaceholder}>
                                            {formData.depart_from_activity ? formatTime(formData.depart_from_activity) : '--:-- --'}
                                        </Text>
                                        <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Destination</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={formData.location}
                                        onChangeText={(text) => setFormData({ ...formData, location: text })}
                                        placeholder="Where are you going?"
                                    />
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Capacity (optional)</Text>
                                    <View style={styles.capacityStepper}>
                                        <TextInput
                                            style={styles.capacityInput}
                                            value={formData.capacity}
                                            onChangeText={(text) => {
                                                const numericValue = text.replace(/[^0-9]/g, '');
                                                setFormData({ ...formData, capacity: numericValue });
                                            }}
                                            placeholder="Maximum number of participants"
                                            keyboardType="numeric"
                                        />
                                        <View style={styles.capacityButtons}>
                                            <TouchableOpacity
                                                style={[styles.capacityButton, styles.capacityButtonTop]}
                                                onPress={() => {
                                                    const current = parseInt(formData.capacity) || 0;
                                                    setFormData({ ...formData, capacity: (current + 1).toString() });
                                                }}
                                            >
                                                <Ionicons name="chevron-up" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.capacityButton}
                                                onPress={() => {
                                                    const current = parseInt(formData.capacity) || 0;
                                                    if (current > 0) setFormData({ ...formData, capacity: (current - 1).toString() });
                                                }}
                                            >
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Staff</Text>
                                    {selectedStaff.length > 0 && (
                                        <View style={styles.selectedStaffChips}>
                                            {selectedStaff.map((staff: any) => (
                                                <TouchableOpacity key={staff.id} style={styles.staffChip} onPress={() => toggleStaffSelection(staff.id)}>
                                                    <Text style={styles.staffChipText}>{staff.name}</Text>
                                                    <Ionicons name="close" size={14} color={theme.colors.surface} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                    <View style={styles.staffSearchContainer}>
                                        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                                        <TextInput
                                            style={styles.staffSearchInput}
                                            value={staffSearchQuery}
                                            onChangeText={setStaffSearchQuery}
                                            placeholder="Search staff to assign..."
                                        />
                                    </View>
                                    <View style={styles.staffListContainer}>
                                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                            {filteredStaff.map((staff: any) => {
                                                const isSelected = selectedStaffIds.includes(staff.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={staff.id}
                                                        style={[styles.staffRow, isSelected && styles.staffRowSelected]}
                                                        onPress={() => toggleStaffSelection(staff.id)}
                                                    >
                                                        <Ionicons
                                                            name={isSelected ? 'checkbox' : 'square-outline'}
                                                            size={18}
                                                            color={isSelected ? theme.colors.secondary : theme.colors.textSecondary}
                                                        />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.staffName}>{staff.name}</Text>
                                                            {!!staff.role && <Text style={styles.staffRole}>{staff.role}</Text>}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Description (optional)</Text>
                                    <TextInput
                                        style={[styles.formTextInput, styles.formTextArea]}
                                        value={formData.description}
                                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                                        multiline
                                    />
                                </View>

                                <View style={styles.mealOptionsSection}>
                                    <Text style={styles.mealOptionsTitle}>Meal Options</Text>
                                    {MEAL_OPTIONS.map((meal) => {
                                        const selected = formData.meal_options.includes(meal);
                                        return (
                                            <TouchableOpacity
                                                key={meal}
                                                style={styles.mealOption}
                                                onPress={() => {
                                                    setFormData({
                                                        ...formData,
                                                        meal_options: selected
                                                            ? formData.meal_options.filter((m) => m !== meal)
                                                            : [...formData.meal_options, meal]
                                                    });
                                                }}
                                            >
                                                <Ionicons
                                                    name={selected ? 'radio-button-on-outline' : 'radio-button-off-outline'}
                                                    size={20}
                                                    color={theme.colors.secondary}
                                                />
                                                <Text style={styles.mealOptionText}>{meal}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {formData.meal_options.includes('Other') && (
                                        <View style={{ marginTop: theme.spacing.sm }}>
                                            <Text style={styles.formLabel}>Meal Notes</Text>
                                            <TextInput
                                                style={[styles.formTextInput, styles.formTextArea]}
                                                value={formData.meal_notes}
                                                onChangeText={(text) => setFormData({ ...formData, meal_notes: text })}
                                                placeholder="e.g., Other location serves lunch"
                                                multiline
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.addActivityBottomSheetActions}>
                                    <TouchableOpacity
                                        style={styles.addActivityCancelButton}
                                        onPress={() => {
                                            closeActivityTransientUi();
                                            setIsAddActivityModalOpen(false);
                                        }}
                                    >
                                        <Text style={styles.addActivityCancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.addActivitySaveButton}
                                        onPress={async () => {
                                            if (!companyId) {
                                                Alert.alert('Error', 'Missing company context. Please sign in again.');
                                                return;
                                            }
                                            if (!formData.title || !formData.event_date || !formData.activity_type) {
                                                Alert.alert('Error', 'Please fill in required fields (Activity Type, Title, and Event Date)');
                                                return;
                                            }

                                            try {
                                                const selectedNames = selectedStaff.map((s: any) => s.name).join(', ');
                                                await addActivityMutation.mutateAsync({ ...formData, chaperone: selectedNames } as any);
                                            } catch (error: any) {
                                                Alert.alert('Error', formatSupabaseWriteError(error) || 'Failed to add activity');
                                            }
                                        }}
                                    >
                                        <Text style={styles.addActivitySaveButtonText}>Add Trip</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAwareScrollView>
                    </Pressable>
                </Pressable>
                {renderActivitySelectOverlay()}
                {renderTimePickerOverlay()}
                </View>
            </Modal>

            {/* Edit Activity Modal - Bottom Sheet */}
            <Modal
                visible={isEditModalOpen}
                transparent={true}
                animationType="fade"
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                onRequestClose={() => {
                    closeActivityTransientUi();
                    setIsEditModalOpen(false);
                    setEditingActivity(null);
                    setSelectedStaffIds([]);
                    setStaffSearchQuery('');
                }}
            >
                <View style={{ flex: 1 }}>
                <Pressable
                    style={styles.centeredOverlay}
                    onPress={() => {
                        closeActivityTransientUi();
                        setIsEditModalOpen(false);
                        setEditingActivity(null);
                    }}
                >
                    <Pressable
                        style={styles.centeredModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="always"
                            style={styles.editActivityBottomSheetScroll}
                            contentContainerStyle={styles.editActivityBottomSheetContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Modal Header */}
                            <View style={styles.editModalHeader}>
                                <Text style={styles.editModalTitle}>
                                    {editingActivity ? 'Edit Activity/Field Trip' : 'Add Activity/Field Trip'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        closeActivityTransientUi();
                                        setIsEditModalOpen(false);
                                        setEditingActivity(null);
                                        setSelectedStaffIds([]);
                                        setStaffSearchQuery('');
                                    }}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Multi-Day Toggle */}
                            <View style={styles.multiDayToggle}>
                                <View style={styles.multiDayToggleContent}>
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                                    <View style={styles.multiDayToggleText}>
                                        <Text style={styles.multiDayToggleLabel}>Multi-Day Trip</Text>
                                        <Text style={styles.multiDayToggleDescription}>
                                            Enable this for events spanning multiple days
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={formData.is_multi_day}
                                    onValueChange={(checked) => {
                                        setFormData({
                                            ...formData,
                                            is_multi_day: checked,
                                            end_date: checked ? formData.end_date : '',
                                        });
                                    }}
                                />
                            </View>

                            {/* Date Fields */}
                            <View style={formData.is_multi_day ? styles.dateFieldsRow : {}}>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>
                                        {formData.is_multi_day ? 'Start Date' : 'Event Date'}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.dateInputContainer}
                                        onPress={() => {
                                            const currentDate = formData.event_date
                                                ? new Date(formData.event_date + 'T00:00:00')
                                                : new Date();
                                            setSelectedDate(currentDate);
                                            setDatePickerField('event_date');
                                            setIsDatePickerOpen(true);
                                        }}
                                    >
                                        <Text style={[styles.dateInputText, !formData.event_date && styles.dateInputPlaceholder]}>
                                            {formData.event_date
                                                ? formatDateForDisplay(formData.event_date)
                                                : 'mm/dd/yyyy'}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                {formData.is_multi_day && (
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>End Date</Text>
                                        <TouchableOpacity
                                            style={styles.dateInputContainer}
                                            onPress={() => {
                                                const currentDate = formData.end_date
                                                    ? new Date(formData.end_date + 'T00:00:00')
                                                    : new Date();
                                                setSelectedDate(currentDate);
                                                setDatePickerField('end_date');
                                                setIsDatePickerOpen(true);
                                            }}
                                        >
                                            <Text style={[styles.dateInputText, !formData.end_date && styles.dateInputPlaceholder]}>
                                                {formData.end_date
                                                    ? formatDateForDisplay(formData.end_date)
                                                    : 'mm/dd/yyyy'}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Duration Badge */}
                            {formData.is_multi_day && formData.event_date && formData.end_date && (
                                <View style={[styles.badge, styles.badgePrimary, styles.durationBadge]}>
                                    <Text style={styles.badgeText}>
                                        {calculateDays(formData.event_date, formData.end_date)}-Day Event
                                    </Text>
                                </View>
                            )}

                            {/* Title */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Trip Name *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.title}
                                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                                    placeholder="e.g., Science Museum Visit"
                                />
                            </View>
                            <Text style={styles.tripNameHelpText}>Descriptive name for this trip or event</Text>

                            {/* Activity Type */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Type *</Text>
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.formInput}
                                        onPress={() => {
                                            setIsActivityTypeDropdownOpen(true);
                                            setIsLocationTypeDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={formData.activity_type ? styles.formInputText : styles.formInputPlaceholder}>
                                            {formData.activity_type
                                                ? formData.activity_type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                                : 'Select type'}
                                        </Text>
                                        <Ionicons
                                            name={isActivityTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Emoji Icon (optional)</Text>
                                <TextInput
                                    style={styles.formTextInput}
                                    value={formData.emoji}
                                    onChangeText={(text) => setFormData({ ...formData, emoji: text })}
                                    placeholder="Paste an emoji e.g. 🚌 🏕️ 🎨"
                                    maxLength={4}
                                />
                                <View style={styles.emojiPresetsRow}>
                                    {EMOJI_PRESETS.map((emoji) => (
                                        <TouchableOpacity
                                            key={emoji}
                                            style={[styles.emojiPresetButton, formData.emoji === emoji && styles.emojiPresetButtonSelected]}
                                            onPress={() => setFormData({ ...formData, emoji: formData.emoji === emoji ? '' : emoji })}
                                        >
                                            <Text style={styles.emojiPresetText}>{emoji}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Location Type</Text>
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.formInput}
                                        onPress={() => {
                                            setIsLocationTypeDropdownOpen(true);
                                            setIsActivityTypeDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={formData.home_away ? styles.formInputText : styles.formInputPlaceholder}>
                                            {formData.home_away ? formData.home_away.toUpperCase() : 'Not Specified'}
                                        </Text>
                                        <Ionicons
                                            name={isLocationTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formField}>
                                <View style={styles.divisionsHeader}>
                                    <Text style={styles.formLabel}>Divisions</Text>
                                    <View style={styles.divisionsActions}>
                                        <TouchableOpacity style={styles.selectAllButton} onPress={() => setFormData({ ...formData, division_ids: divisions.map((d: any) => d.id) })}>
                                            <Text style={styles.selectAllButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.selectAllButton} onPress={() => setFormData({ ...formData, division_ids: [] })}>
                                            <Text style={styles.selectAllButtonText}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.divisionsList}>
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {divisions.map((division: any) => {
                                            const isSelected = formData.division_ids.includes(division.id);
                                            return (
                                                <TouchableOpacity
                                                    key={division.id}
                                                    style={styles.divisionCheckbox}
                                                    onPress={() => {
                                                        setFormData({
                                                            ...formData,
                                                            division_ids: isSelected
                                                                ? formData.division_ids.filter((id) => id !== division.id)
                                                                : [...formData.division_ids, division.id]
                                                        });
                                                    }}
                                                >
                                                    <Ionicons
                                                        name={isSelected ? 'checkbox' : 'square-outline'}
                                                        size={18}
                                                        color={isSelected ? theme.colors.secondary : theme.colors.textSecondary}
                                                    />
                                                    <Text style={styles.divisionCheckboxText}>{division.name}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>


                            {/* Optional Fields */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Departure Time</Text>
                                <TouchableOpacity
                                    style={styles.formInput}
                                    onPress={() => openTimePicker('depart_from_camp')}
                                >
                                    <Text style={formData.depart_from_camp ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.depart_from_camp ? formatTime(formData.depart_from_camp) : '--:-- --'}
                                    </Text>
                                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Return Time</Text>
                                <TouchableOpacity
                                    style={styles.formInput}
                                    onPress={() => openTimePicker('depart_from_activity')}
                                >
                                    <Text style={formData.depart_from_activity ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.depart_from_activity ? formatTime(formData.depart_from_activity) : '--:-- --'}
                                    </Text>
                                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Destination</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.location}
                                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                                    placeholder="Where are you going?"
                                />
                            </View>

                            <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Capacity</Text>
                                <View style={styles.capacityStepper}>
                                    <TextInput
                                        style={styles.capacityInput}
                                        value={formData.capacity}
                                        onChangeText={(text) => {
                                            // Only allow numbers
                                            const numericValue = text.replace(/[^0-9]/g, '');
                                            setFormData({ ...formData, capacity: numericValue });
                                        }}
                                            placeholder="Maximum number of children"
                                        keyboardType="numeric"
                                    />
                                    <View style={styles.capacityButtons}>
                                        <TouchableOpacity
                                            style={[styles.capacityButton, styles.capacityButtonTop]}
                                            onPress={() => {
                                                const current = parseInt(formData.capacity) || 0;
                                                setFormData({ ...formData, capacity: (current + 1).toString() });
                                            }}
                                        >
                                            <Ionicons name="chevron-up" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.capacityButton}
                                            onPress={() => {
                                                const current = parseInt(formData.capacity) || 0;
                                                if (current > 0) {
                                                    setFormData({ ...formData, capacity: (current - 1).toString() });
                                                }
                                            }}
                                        >
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Staff</Text>
                                {selectedStaff.length > 0 && (
                                    <View style={styles.selectedStaffChips}>
                                        {selectedStaff.map((staff: any) => (
                                            <TouchableOpacity key={staff.id} style={styles.staffChip} onPress={() => toggleStaffSelection(staff.id)}>
                                                <Text style={styles.staffChipText}>{staff.name}</Text>
                                                <Ionicons name="close" size={14} color={theme.colors.surface} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <View style={styles.staffSearchContainer}>
                                    <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                                    <TextInput
                                        style={styles.staffSearchInput}
                                        value={staffSearchQuery}
                                        onChangeText={setStaffSearchQuery}
                                        placeholder="Search staff to assign..."
                                    />
                                </View>
                                <View style={styles.staffListContainer}>
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {filteredStaff.map((staff: any) => {
                                            const isSelected = selectedStaffIds.includes(staff.id);
                                            return (
                                                <TouchableOpacity
                                                    key={staff.id}
                                                    style={[styles.staffRow, isSelected && styles.staffRowSelected]}
                                                    onPress={() => toggleStaffSelection(staff.id)}
                                                >
                                                    <Ionicons
                                                        name={isSelected ? 'checkbox' : 'square-outline'}
                                                        size={18}
                                                        color={isSelected ? theme.colors.secondary : theme.colors.textSecondary}
                                                    />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.staffName}>{staff.name}</Text>
                                                        {!!staff.role && <Text style={styles.staffRole}>{staff.role}</Text>}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Description (optional)</Text>
                                <TextInput
                                    style={[styles.formTextInput, styles.formTextArea]}
                                    value={formData.description}
                                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                                    multiline
                                />
                            </View>

                            <View style={styles.mealOptionsSection}>
                                <Text style={styles.mealOptionsTitle}>Meal Options</Text>
                                {MEAL_OPTIONS.map((meal) => {
                                    const selected = formData.meal_options.includes(meal);
                                    return (
                                        <TouchableOpacity
                                            key={meal}
                                            style={styles.mealOption}
                                            onPress={() => {
                                                setFormData({
                                                    ...formData,
                                                    meal_options: selected
                                                        ? formData.meal_options.filter((m) => m !== meal)
                                                        : [...formData.meal_options, meal]
                                                });
                                            }}
                                        >
                                            <Ionicons
                                                name={selected ? 'radio-button-on-outline' : 'radio-button-off-outline'}
                                                size={20}
                                                color={theme.colors.secondary}
                                            />
                                            <Text style={styles.mealOptionText}>{meal}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                                {formData.meal_options.includes('Other') && (
                                    <View style={{ marginTop: theme.spacing.sm }}>
                                        <Text style={styles.formLabel}>Meal Notes</Text>
                                        <TextInput
                                            style={[styles.formTextInput, styles.formTextArea]}
                                            value={formData.meal_notes}
                                            onChangeText={(text) => setFormData({ ...formData, meal_notes: text })}
                                            placeholder="e.g., Other location serves lunch"
                                            multiline
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.cancelButton,
                                        pressed && styles.cancelButtonPressed
                                    ]}
                                    onPress={() => {
                                        setIsEditModalOpen(false);
                                        setEditingActivity(null);
                                        setIsActivityTypeDropdownOpen(false);
                                        setIsLocationTypeDropdownOpen(false);
                                        setSelectedStaffIds([]);
                                        setStaffSearchQuery('');
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </Pressable>
                                <TouchableOpacity
                                    style={styles.updateButton}
                                    onPress={() => {
                                        if (!formData.title || !formData.event_date || !formData.activity_type) {
                                            Alert.alert('Error', 'Please fill in required fields (Activity Type, Title, and Event Date)');
                                            return;
                                        }
                                        if (editingActivity) {
                                            const selectedNames = selectedStaff.map((s: any) => s.name).join(', ');
                                            updateActivityMutation.mutate({
                                                ...formData,
                                                chaperone: selectedNames,
                                                id: editingActivity.id,
                                                previous_title: editingActivity.title,
                                                previous_event_date: editingActivity.event_date,
                                            });
                                        }
                                    }}
                                >
                                    <Text style={styles.updateButtonText}>
                                        {editingActivity ? 'Update' : 'Add'} Activity
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAwareScrollView>
                    </Pressable>
                </Pressable>
                {renderActivitySelectOverlay()}
                {renderTimePickerOverlay()}
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={isDeleteModalOpen}
                transparent
                animationType="fade"
                statusBarTranslucent={Platform.OS === 'android'}
                onRequestClose={() => {
                    if (isDeleting) return;
                    setIsDeleteModalOpen(false);
                    setActivityToDelete(null);
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        if (isDeleting) return;
                        setIsDeleteModalOpen(false);
                        setActivityToDelete(null);
                    }}
                >
                    <Pressable style={styles.deleteModalContainer} onPress={(e) => e.stopPropagation()}>
                        <Ionicons name="warning-outline" size={36} color={theme.colors.danger} style={{ alignSelf: 'center', marginBottom: 8 }} />
                        <Text style={styles.deleteModalTitle}>Delete Activity/Field Trip</Text>
                        <Text style={styles.deleteModalMessage}>
                            Remove &quot;{activityToDelete?.title || 'this activity'}&quot;? This cannot be undone.
                        </Text>
                        <View style={styles.deleteModalActions}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.deleteCancelButton,
                                    pressed && styles.deleteCancelButtonPressed
                                ]}
                                onPress={() => {
                                    if (isDeleting) return;
                                    setIsDeleteModalOpen(false);
                                    setActivityToDelete(null);
                                }}
                                disabled={isDeleting}
                            >
                                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                            </Pressable>
                            <TouchableOpacity
                                style={[styles.deleteConfirmButton, isDeleting && { opacity: 0.6 }]}
                                onPress={handleDeleteActivity}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color={theme.colors.surface} />
                                ) : (
                                    <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={isDatePickerOpen}
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setIsDatePickerOpen(false);
                    setDatePickerField(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerTitle}>Select Date</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsDatePickerOpen(false);
                                    setDatePickerField(null);
                                }}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.datePickerContent}>
                            {/* Month Selection */}
                            <View style={styles.datePickerColumn}>
                                <Text style={styles.datePickerLabel}>Month</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                        const isSelected = selectedDate.getMonth() + 1 === month;
                                        return (
                                            <TouchableOpacity
                                                key={month}
                                                style={[
                                                    styles.datePickerOption,
                                                    isSelected && styles.datePickerOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setMonth(month - 1);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    isSelected && styles.datePickerOptionTextSelected
                                                ]}>
                                                    {monthNames[month - 1]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </KeyboardAwareScrollView>
                            </View>

                            {/* Day Selection */}
                            <View style={styles.datePickerColumn}>
                                <Text style={styles.datePickerLabel}>Day</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                        const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                                        const isSelected = selectedDate.getDate() === day;
                                        const isValid = day <= daysInMonth;
                                        return (
                                            <TouchableOpacity
                                                key={day}
                                                style={[
                                                    styles.datePickerOption,
                                                    isSelected && styles.datePickerOptionSelected,
                                                    !isValid && styles.datePickerOptionDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isValid) {
                                                        const newDate = new Date(selectedDate);
                                                        newDate.setDate(day);
                                                        setSelectedDate(newDate);
                                                    }
                                                }}
                                                disabled={!isValid}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    isSelected && styles.datePickerOptionTextSelected,
                                                    !isValid && styles.datePickerOptionTextDisabled
                                                ]}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </KeyboardAwareScrollView>
                            </View>

                            {/* Year Selection */}
                            <View style={styles.datePickerColumn}>
                                <Text style={styles.datePickerLabel}>Year</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => {
                                        const isSelected = selectedDate.getFullYear() === year;
                                        return (
                                            <TouchableOpacity
                                                key={year}
                                                style={[
                                                    styles.datePickerOption,
                                                    isSelected && styles.datePickerOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setFullYear(year);
                                                    // Adjust day if it's invalid for the new year/month
                                                    const daysInMonth = new Date(year, newDate.getMonth() + 1, 0).getDate();
                                                    if (newDate.getDate() > daysInMonth) {
                                                        newDate.setDate(daysInMonth);
                                                    }
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    isSelected && styles.datePickerOptionTextSelected
                                                ]}>
                                                    {year}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </KeyboardAwareScrollView>
                            </View>
                        </View>

                        {/* Selected Date Display */}
                        <View style={styles.datePickerDisplay}>
                            <Text style={styles.datePickerDisplayText}>
                                {formatDateForDisplay(formatDateForStorage(selectedDate))}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.datePickerActions}>
                            <TouchableOpacity
                                style={styles.datePickerCancelButton}
                                onPress={() => {
                                    setIsDatePickerOpen(false);
                                    setDatePickerField(null);
                                }}
                            >
                                <Text style={styles.datePickerCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.datePickerConfirmButton}
                                onPress={() => {
                                    if (datePickerField) {
                                        const dateString = formatDateForStorage(selectedDate);
                                        setFormData({ ...formData, [datePickerField]: dateString });
                                    }
                                    setIsDatePickerOpen(false);
                                    setDatePickerField(null);
                                }}
                            >
                                <Text style={styles.datePickerConfirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={isHelpModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsHelpModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.helpModalContainer}>
                        {/* Header */}
                        <View style={styles.helpModalHeader}>
                            <Text style={styles.helpModalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity
                                style={styles.helpModalCloseButton}
                                onPress={() => setIsHelpModalOpen(false)}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.helpModalTabs}
                            contentContainerStyle={styles.helpModalTabsContent}
                        >
                            {['Children', 'Staff', 'Medications', 'Trips', 'Menu', 'Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'].map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[
                                        styles.helpModalTab,
                                        helpModalTab === tab && styles.helpModalTabActive
                                    ]}
                                    onPress={() => setHelpModalTab(tab)}
                                >
                                    <Text style={[
                                        styles.helpModalTabText,
                                        helpModalTab === tab && styles.helpModalTabTextActive
                                    ]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </KeyboardAwareScrollView>

                        {/* Content */}
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.helpModalContent}>
                            {helpModalTab === 'Trips' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Activities & Field Trips</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for activities and field trips upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        title, event_date, end_date, is_multi_day, activity_type, home_away, division_ids, depart_from_camp, depart_from_activity, location, capacity, chaperone, description, meal_options
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Junior Hershey Trip, 2026-07-28, 2026-07-29, true, field-trip, away, ["1","2"], 08:00, 18:00, Hershey Park, 50, John Doe, Fun trip to Hershey Park, ["Lunch","Dinner"]
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ division_ids must be an array of valid division IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ event_date and end_date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ is_multi_day: true or false</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ home_away: "home" or "away"</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ meal_options must be an array (e.g., ["Breakfast","Lunch"])</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Leave fields empty for optional columns</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Dates must be in YYYY-MM-DD format</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Time format: HH:MM (24-hour format)</Text>
                                </View>
                            )}
                            {helpModalTab === 'Staff' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Staff Directory</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for staff directory upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        name, email, phone, role, department, hire_date, leader_id, status, season
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, {"<leader_id>"}, active, Summer 2024
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ leader_id must be a valid UUID from staff table</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ hire_date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Leave fields empty for optional columns</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Dates must be in YYYY-MM-DD format</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ UUIDs can be obtained from the backend for existing records</Text>
                                </View>
                            )}
                            {helpModalTab === 'Children' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Children Directory</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for children/camper directory upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        name, date_of_birth, gender, division_id, parent_name, parent_email, parent_phone, medical_notes, dietary_restrictions
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        John Doe, 2010-05-15, male, 1, Jane Doe, jane@example.com, 555-1234, None, Vegetarian
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ division_id must be a valid division ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ date_of_birth format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Dates must be in YYYY-MM-DD format</Text>
                                </View>
                            )}
                            {helpModalTab === 'Medications' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Medications</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for medications upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        camper_id, medication_name, dosage, frequency, start_date, end_date, notes
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        1, Advil, 200mg, Twice daily, 2024-07-01, 2024-08-31, Take with food
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id must be a valid camper ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Menu' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Menu</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for menu upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        date, meal_type, item_name, description, dietary_tags
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        2024-07-15, Lunch, Grilled Chicken, Delicious grilled chicken with sides, ["Gluten-Free","Dairy-Free"]
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ meal_type: Breakfast, Lunch, Dinner, or Snack</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Awards' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Awards</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for awards upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        camper_id, award_name, award_date, category, description
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        1, Camper of the Week, 2024-07-20, Recognition, Outstanding behavior
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id must be a valid camper ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Daily Notes' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Daily Notes</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for daily notes upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        camper_id, date, note_type, content, staff_id
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        1, 2024-07-15, General, Had a great day at the pool, 5
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id and staff_id must be valid IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Incidents' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Incidents</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for incident reports upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        date, time, camper_id, incident_type, description, severity, staff_id
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        2024-07-15, 14:30, 1, Minor Injury, Scraped knee during activity, Low, 5
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id and staff_id must be valid IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Time format: HH:MM</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Calendar' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Calendar Events</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for calendar events upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        title, event_date, end_date, event_type, description, location
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Camp Fire, 2024-07-20, 2024-07-20, Event, Evening campfire with songs, Main Field
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Sports' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Sports</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for sports activities upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        sport_name, date, time, location, division_ids, coach_id
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Basketball, 2024-07-15, 10:00, Gym, ["1","2"], 5
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ division_ids must be an array of valid division IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ coach_id must be a valid staff ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Time format: HH:MM</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                        </KeyboardAwareScrollView>
                    </View>
                </View>
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
        flex: 1,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    headerTitle: {
        ...theme.typography.h2,
        fontSize: 20,
    },
    headerSubtitle: {
        ...theme.typography.bodySmall,
        marginTop: 4,
        color: theme.colors.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    controlsBar: {
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    controlsTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    controlsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    controlsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
        flexWrap: 'wrap',
    },
    divisionFilterContainer: {
        minWidth: 150,
    },
    sortButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    sortButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    divisionDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
    },
    divisionText: {
        ...theme.typography.body,
        fontSize: 14,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    viewToggleButton: {
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    viewToggleButtonActive: {
        backgroundColor: theme.colors.accent,
    },
    iconButton: {
        padding: theme.spacing.sm,
    },
    uploadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: theme.colors.textSecondary,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
    },
    uploadButtonText: {
        color: theme.colors.surface,
        fontSize: 13,
        fontWeight: '600',
    },
    addButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: theme.colors.secondary,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
    },
    addButtonText: {
        color: theme.colors.surface,
        fontSize: 13,
        fontWeight: '600',
    },
    // Modal styles
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
        maxHeight: 400,
    },
    dropdownItem: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: '#eff6ff',
    },
    dropdownItemText: {
        ...theme.typography.body,
        fontSize: 14,
    },
    dropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    // List view styles
    listViewContainer: {
        gap: theme.spacing.lg,
    },
    monthGroup: {
        marginBottom: theme.spacing.lg,
    },
    monthHeader: {
        ...theme.typography.h2,
        fontSize: 20,
        marginBottom: theme.spacing.md,
        color: theme.colors.text,
    },
    activitiesList: {
        gap: theme.spacing.md,
    },
    activityCard: {
        padding: theme.spacing.md,
    },
    activityCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    activityCardTitleContainer: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    activityCardTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    activityCardDate: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    activityCardActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    actionIconButton: {
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    actionIconButtonPressed: {
        backgroundColor: '#f3f4f6', // Light gray background on press
    },
    activityCardBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: theme.spacing.sm,
        marginHorizontal: -2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.lg,
        marginRight: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    badgeType: {
        backgroundColor: '#2563eb',
    },
    badgeTypeText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    badgeMultiDay: {
        backgroundColor: '#ccfbf1',
    },
    badgeMultiDayText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: '#0d9488',
        fontWeight: '500',
    },
    badgePrimary: {
        backgroundColor: theme.colors.secondary,
    },
    badgeDivision: {
        backgroundColor: '#26A69A',
    },
    badgeDivisionText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    badgeSecondary: {
        backgroundColor: '#e0e7ff',
    },
    badgeOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    badgeText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.surface,
        fontWeight: '500',
    },
    badgeTextOutline: {
        color: theme.colors.textSecondary,
    },
    badgeTextSecondary: {
        color: theme.colors.text,
    },
    activityCardDetailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xs,
    },
    detailIcon: {
        marginRight: theme.spacing.xs,
        marginTop: 2,
    },
    activityCardDetailText: {
        ...theme.typography.bodySmall,
        flex: 1,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    activityCardNotes: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
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
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    editModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
    },
    multiDayToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    multiDayToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    multiDayToggleText: {
        flex: 1,
    },
    multiDayToggleLabel: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
    },
    multiDayToggleDescription: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    dateFieldsRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    formField: {
        marginBottom: theme.spacing.md,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '500',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    tripNameHelpText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: -4,
        marginBottom: theme.spacing.md,
    },
    formInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
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
    dropdownContainer: {
        zIndex: 10,
    },
    dropdownList: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        maxHeight: 200,
        ...theme.shadows.card,
        elevation: 5, // For Android shadow
    },
    dropdownItemForm: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemFormSelected: {
        backgroundColor: '#fff7ed', // Orange tint for selected/hovered item
    },
    dropdownItemFormText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownItemFormTextSelected: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    formTextInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
        fontSize: 14,
        color: theme.colors.text,
    },
    formTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.sm,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    durationBadge: {
        alignSelf: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    divisionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    divisionsActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    selectAllButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
    },
    selectAllButtonText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.text,
    },
    divisionsList: {
        maxHeight: 200,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
    },
    divisionCheckbox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    divisionCheckboxText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    mealOptionsSection: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    mealOptionsTitle: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    mealOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    mealOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    emojiPresetsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    emojiPresetButton: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        backgroundColor: theme.colors.surface,
    },
    emojiPresetButtonSelected: {
        borderColor: theme.colors.secondary,
        backgroundColor: '#e8f0ff',
    },
    emojiPresetText: {
        fontSize: 18,
    },
    selectedStaffChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    staffChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.secondary,
        borderRadius: 999,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
    },
    staffChipText: {
        ...theme.typography.bodySmall,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    staffSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        minHeight: 40,
    },
    staffSearchInput: {
        flex: 1,
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: theme.spacing.xs,
    },
    staffListContainer: {
        marginTop: theme.spacing.sm,
        maxHeight: 180,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    staffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    staffRowSelected: {
        backgroundColor: '#f5f8ff',
    },
    staffName: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    staffRole: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.accent, // Orange color on press
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
        fontWeight: '600',
        color: theme.colors.surface,
    },
    // Time Picker Styles
    timePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timePickerModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 400,
        ...theme.shadows.card,
        elevation: 5,
    },
    timePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    timePickerTitle: {
        ...theme.typography.h2,
        fontSize: 18,
    },
    timePickerContent: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
    },
    timePickerColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
    },
    timePickerLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    timePickerScroll: {
        width: '100%',
        maxHeight: 130,
    },
    timePickerOption: {
        paddingVertical: 6,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        marginVertical: 2,
        alignItems: 'center',
        minWidth: 56,
    },
    timePickerOptionSelected: {
        backgroundColor: theme.colors.secondary,
    },
    timePickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    timePickerOptionTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    timePickerDisplay: {
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    timePickerDisplayText: {
        ...theme.typography.h2,
        fontSize: 24,
        color: theme.colors.text,
    },
    timePickerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
    },
    timePickerCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    timePickerCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    timePickerConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    timePickerConfirmButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    // Capacity Stepper Styles
    capacityStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    capacityInput: {
        flex: 1,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    capacityButtons: {
        flexDirection: 'column',
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.border,
    },
    capacityButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 40,
        backgroundColor: theme.colors.background,
    },
    capacityButtonTop: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    // Date Input Styles
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
    },
    dateInputText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    dateInputPlaceholder: {
        color: theme.colors.textSecondary,
    },
    // Date Picker Modal Styles
    datePickerModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%',
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
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    datePickerContent: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        maxHeight: 300,
    },
    datePickerColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
    },
    datePickerLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    datePickerScroll: {
        width: '100%',
        maxHeight: 250,
    },
    datePickerOption: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        marginVertical: theme.spacing.xs,
        alignItems: 'center',
        minWidth: 60,
    },
    datePickerOptionSelected: {
        backgroundColor: theme.colors.secondary,
    },
    datePickerOptionDisabled: {
        opacity: 0.3,
    },
    datePickerOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    datePickerOptionTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerOptionTextDisabled: {
        color: theme.colors.textSecondary,
    },
    datePickerDisplay: {
        padding: theme.spacing.md,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerDisplayText: {
        ...theme.typography.h2,
        fontSize: 20,
        color: theme.colors.text,
    },
    datePickerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
    },
    datePickerCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    datePickerCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    datePickerConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    datePickerConfirmButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Delete Modal Styles
    deleteModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        width: '90%',
        maxWidth: 500,
    },
    deleteModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    deleteModalMessage: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
    },
    deleteCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    deleteCancelButtonPressed: {
        backgroundColor: theme.colors.accent, // Orange color on press
    },
    deleteCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    deleteConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    deleteConfirmButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Help Modal Styles
    helpModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '95%',
        maxWidth: 800,
        maxHeight: '85%',
        overflow: 'hidden',
        alignSelf: 'center',
    },
    helpModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    helpModalTitle: {
        ...theme.typography.h2,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    helpModalCloseButton: {
        padding: theme.spacing.xs,
        minWidth: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpModalTabs: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    helpModalTabsContent: {
        paddingHorizontal: theme.spacing.sm,
    },
    helpModalTab: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        marginRight: theme.spacing.xs,
    },
    helpModalTabActive: {
        borderBottomColor: theme.colors.secondary,
    },
    helpModalTabText: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    helpModalTabTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    helpModalContent: {
        padding: theme.spacing.md,
        maxHeight: 400,
    },
    helpModalHeading: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    helpModalDescription: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        lineHeight: 18,
    },
    helpModalLabel: {
        ...theme.typography.body,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    helpModalCode: {
        ...theme.typography.body,
        fontSize: 11,
        fontFamily: 'monospace',
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.sm,
        overflow: 'hidden',
        flexWrap: 'wrap',
    },
    helpModalBullet: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        paddingLeft: theme.spacing.sm,
        lineHeight: 18,
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
        paddingTop: theme.spacing.md,
        paddingBottom: 40,
        paddingHorizontal: theme.spacing.md,
    },
    divisionBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '60%',
    },
    divisionBottomSheetScroll: {
        maxHeight: 400,
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
    activityTypePickerList: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xs,
        gap: theme.spacing.md,
    },
    bottomSheetOptionSelected: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
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
    // Add Activity Bottom Sheet Styles
    addActivityBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    addActivityBottomSheetScroll: {
        // removed flex: 1 to prevent collapse on mobile
    },
    addActivityBottomSheetContent: {
        paddingHorizontal: theme.spacing.md,
    },
    addActivityBottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    addActivityBottomSheetTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    addActivityFormContent: {
        gap: theme.spacing.md,
    },
    addActivityBottomSheetActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    addActivityCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    addActivityCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    addActivitySaveButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    addActivitySaveButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Edit Activity Bottom Sheet Styles
    editActivityBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    editActivityBottomSheetScroll: {
        // removed flex: 1 to prevent collapse on mobile
    },
    editActivityBottomSheetContent: {
        padding: theme.spacing.lg,
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

