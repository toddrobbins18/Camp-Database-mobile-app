import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useDivisionsLookup } from '../api/permissions';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { fetchAwardsForSeason } from '../lib/awardsQueries';
import { fetchExpandedMedicationSchedule } from '../lib/medicationReportSchedule';
import { parseMedicationMealTimeLabels } from '../lib/medicationMealTimeDisplay';
import {
    attachSportsEventSortTime,
    buildDriverBySportsEventId,
    compareReportRowsByDateThenTime,
    compareSportsEventReportRows,
    formatSportsEventMealOptions,
    formatSportsEventReportTime,
} from '../lib/sportsEventReportUtils';

interface ReportsScreenProps {
    navigation: any;
}

type ReportType =
    | 'incidents'
    | 'staff_evaluations'
    | 'camper_reports'
    | 'awards'
    | 'sports_events'
    | 'conflicts'
    | 'medications'
    | 'allergies'
    | 're_enrollment'
    | 'tshirt_sizes'
    | 'trips'
    | 'activities'
    | 'appointments';

type ReportOption = { value: ReportType; label: string };
type ReportRow = Record<string, string | number | null | undefined>;

const parseISODate = (value: string) => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map((x) => Number(x));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

const formatForDisplay = (value: string) => {
    const date = parseISODate(value);
    if (!date) return 'mm/dd/yyyy';
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const sanitizeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    return String(value).replace(/"/g, '""');
};

export const ReportsScreen = ({ navigation }: ReportsScreenProps) => {
    const { companyId, season, companySlug } = useCompany();
    const { data: divisions = [] } = useDivisionsLookup(companyId);

    const [reportType, setReportType] = useState<ReportType>('incidents');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDivisionId, setSelectedDivisionId] = useState<string>('all');
    const [showReportTypeDropdown, setShowReportTypeDropdown] = useState(false);
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [startDatePickerMonth, setStartDatePickerMonth] = useState(new Date().getMonth());
    const [startDatePickerYear, setStartDatePickerYear] = useState(new Date().getFullYear());
    const [endDatePickerMonth, setEndDatePickerMonth] = useState(new Date().getMonth());
    const [endDatePickerYear, setEndDatePickerYear] = useState(new Date().getFullYear());

    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [summary, setSummary] = useState<Record<string, string | number>>({});
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const reportTypeOptions: ReportOption[] = useMemo(() => {
        const base: ReportOption[] = [
            { value: 'incidents', label: 'Incident Reports' },
            { value: 'staff_evaluations', label: 'Staff Evaluations' },
            { value: 'camper_reports', label: 'Camper Reports' },
            { value: 'awards', label: 'Awards' },
            { value: 'sports_events', label: 'Sports Events' },
            { value: 'conflicts', label: 'Schedule Conflicts' },
            { value: 'medications', label: 'Medication Schedule' },
            { value: 'allergies', label: 'Allergy Report' },
            { value: 're_enrollment', label: 'Re-Enrollment Report' },
            { value: 'tshirt_sizes', label: 'T-Shirt Sizes' },
        ];

        if (companySlug !== 'timber-lake-camp') {
            base.push({ value: 'trips', label: 'Trips' });
            base.push({ value: 'activities', label: 'Activities & Field Trips' });
        }

        const appointmentCamps = ['tyler-hill-camp', 'timber-lake-camp', 'timber-lake-west', 'trails-end-camp'];
        if (companySlug && appointmentCamps.includes(companySlug)) {
            base.push({ value: 'appointments', label: 'Appointments Report' });
        }

        return base;
    }, [companySlug]);

    const selectedDivisionName = useMemo(() => {
        if (selectedDivisionId === 'all') return 'All Divisions';
        return divisions.find((d: any) => d.id === selectedDivisionId)?.name || 'All Divisions';
    }, [selectedDivisionId, divisions]);

    const currentReportLabel = useMemo(
        () => reportTypeOptions.find((r) => r.value === reportType)?.label || 'Incident Reports',
        [reportTypeOptions, reportType]
    );

    const applyDivisionFilter = <T extends { division_id?: string | null }>(rows: T[]) => {
        if (selectedDivisionId === 'all') return rows;
        return rows.filter((r) => r.division_id === selectedDivisionId);
    };

    const fetchReportData = async () => {
        if (!companyId || !season) return;
        setLoading(true);
        try {
            let dataRows: ReportRow[] = [];
            let summaryRows: Record<string, string | number> = {};
            const fromDate = startDate || '1900-01-01';
            const toDate = endDate || '2100-12-31';

            // Keep report filtering aligned with web ReportingCenter/AuthContext behavior.
            const resolveWebDivisionFilter = async (): Promise<string[] | null> => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return [];

                const { data: roleRows } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id);

                const roles = (roleRows || []).map((r: any) => r.role as string);
                const isSuperAdmin = roles.includes('super_admin');
                const effectiveRole = isSuperAdmin
                    ? 'super_admin'
                    : roles.includes('admin')
                        ? 'admin'
                        : (roles[0] || null);

                const fullDivisionAccessRoles = new Set(['admin', 'super_admin', 'specialist', 'staff', 'health_center']);
                if (effectiveRole && fullDivisionAccessRoles.has(effectiveRole)) {
                    return null;
                }

                const { data: divPerms } = await supabase
                    .from('division_permissions')
                    .select('division_id')
                    .eq('user_id', user.id)
                    .eq('can_access', true);

                const ids = [...new Set((divPerms || []).map((d: any) => d.division_id).filter(Boolean))] as string[];
                return ids.length > 0 ? ids : [];
            };

            const allowedDivisionIds = await resolveWebDivisionFilter();

            switch (reportType) {
                case 'incidents': {
                    const { data } = await supabase
                        .from('incident_reports')
                        .select('date, type, severity, status, description, children(name, division_id)')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .gte('date', fromDate)
                        .lte('date', toDate)
                        .order('date', { ascending: false });

                    const filtered = (data || []).filter((row: any) =>
                        selectedDivisionId === 'all' ? true : row.children?.division_id === selectedDivisionId
                    );
                    dataRows = filtered.map((row: any) => ({
                        Date: row.date,
                        Child: row.children?.name || 'Unknown',
                        Type: row.type || 'N/A',
                        Severity: row.severity || 'N/A',
                        Status: row.status || 'N/A',
                        Description: row.description || '',
                    }));
                    summaryRows = {
                        'Total Incidents': filtered.length,
                        Open: filtered.filter((r: any) => r.status === 'open').length,
                        Resolved: filtered.filter((r: any) => r.status === 'resolved').length,
                    };
                    break;
                }
                case 'staff_evaluations': {
                    const { data: evals } = await supabase
                        .from('staff_evaluations')
                        .select('date, category, rating, evaluator, comments, staff_id')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .gte('date', fromDate)
                        .lte('date', toDate)
                        .order('date', { ascending: false });

                    const staffIds = [...new Set((evals || []).map((e: any) => e.staff_id).filter(Boolean))];
                    const { data: staff } = staffIds.length
                        ? await supabase.from('staff').select('id, name').in('id', staffIds)
                        : { data: [] as any[] };
                    const staffMap = new Map((staff || []).map((s: any) => [s.id, s.name]));

                    dataRows = (evals || []).map((e: any) => ({
                        Date: e.date,
                        Staff: staffMap.get(e.staff_id) || 'Unknown',
                        Category: e.category || 'N/A',
                        Rating: e.rating ?? '-',
                        Evaluator: e.evaluator || 'N/A',
                        Comments: e.comments || '',
                    }));
                    const avg = (evals || []).length
                        ? (evals || []).reduce((sum: number, e: any) => sum + (Number(e.rating) || 0), 0) / (evals || []).length
                        : 0;
                    summaryRows = {
                        'Total Evaluations': (evals || []).length,
                        'Average Rating': avg.toFixed(2),
                    };
                    break;
                }
                case 'camper_reports': {
                    const { data } = await supabase
                        .from('camper_reports')
                        .select('report_date, report_type, report_data, children(name, division_id, divisions(name))')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .gte('report_date', fromDate)
                        .lte('report_date', toDate)
                        .order('report_date', { ascending: false });

                    const filtered = (data || []).filter((row: any) =>
                        selectedDivisionId === 'all' ? true : row.children?.division_id === selectedDivisionId
                    );

                    dataRows = filtered.map((row: any) => {
                        const reportData = row.report_data && typeof row.report_data === 'object' ? row.report_data : {};
                        const questionCount = Array.isArray(reportData.responses)
                            ? reportData.responses.length
                            : typeof reportData === 'object'
                                ? Object.keys(reportData).length
                                : 0;

                        return {
                            Date: row.report_date,
                            Child: row.children?.name || 'Unknown',
                            Division: row.children?.divisions?.name || 'N/A',
                            'Report Type': row.report_type === '10_day' ? '10-Day' : 'End of Summer',
                            Questions: questionCount,
                        };
                    });

                    const tenDayCount = filtered.filter((r: any) => r.report_type === '10_day').length;
                    const endOfSummerCount = filtered.filter((r: any) => r.report_type === 'end_of_summer').length;
                    summaryRows = {
                        'Total Camper Reports': filtered.length,
                        '10-Day Reports': tenDayCount,
                        'End of Summer Reports': endOfSummerCount,
                    };
                    break;
                }
                case 'awards': {
                    const divisionNameById = new Map(
                        (divisions as any[]).map((d: any) => [d.id, d.name]),
                    );
                    const awardsList = await fetchAwardsForSeason(
                        supabase,
                        companyId,
                        season,
                        allowedDivisionIds,
                        (divisions as any[]).map((d: any) => ({ id: d.id, name: d.name })),
                    );
                    const dateFiltered = awardsList.filter(
                        (a) => a.date >= fromDate && a.date <= toDate,
                    );
                    const filtered =
                        selectedDivisionId === 'all'
                            ? dateFiltered
                            : dateFiltered.filter(
                                  (a) => a.children?.division_id === selectedDivisionId,
                              );
                    dataRows = filtered.map((row: any) => ({
                        Date: row.date,
                        Child: row.children?.name || 'Unknown',
                        Division:
                            (row.children?.division_id &&
                                divisionNameById.get(row.children.division_id)) ||
                            'N/A',
                        Title: row.title || 'N/A',
                        Category: row.category || 'N/A',
                        Description: row.description || '',
                    }));
                    summaryRows = { 'Total Awards': filtered.length };
                    break;
                }
                case 'sports_events': {
                    const [{ data: sportsEvents }, { data: sportsTrips }] = await Promise.all([
                        supabase
                            .from('sports_calendar')
                            .select('id, event_date, title, meal_options, start_time_field, time, depart_time')
                            .eq('company_id', companyId)
                            .eq('season', season)
                            .gte('event_date', fromDate)
                            .lte('event_date', toDate)
                            .order('event_date', { ascending: true }),
                        supabase
                            .from('trips')
                            .select('sports_event_id, driver')
                            .eq('company_id', companyId)
                            .eq('season', season)
                            .not('sports_event_id', 'is', null),
                    ]);

                    const driverByEventId = buildDriverBySportsEventId(sportsTrips);

                    dataRows = (sportsEvents || [])
                        .map((row: any) =>
                            attachSportsEventSortTime(
                                {
                                    Date: row.event_date,
                                    Time: formatSportsEventReportTime(row),
                                    Event: row.title || 'N/A',
                                    'Meal Options': formatSportsEventMealOptions(row.meal_options),
                                    Driver: (row.id && driverByEventId.get(row.id)) || '-',
                                },
                                row,
                            ),
                        )
                        .sort((a, b) => compareSportsEventReportRows(a, b, 'asc'));
                    summaryRows = { 'Total Events': dataRows.length };
                    break;
                }
                case 'trips': {
                    const { data } = await supabase
                        .from('trips')
                        .select('date, name, type, destination, departure_time, return_time, status')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .gte('date', fromDate)
                        .lte('date', toDate)
                        .order('date', { ascending: false });
                    dataRows = (data || []).map((row: any) => ({
                        Date: row.date,
                        Name: row.name || 'N/A',
                        Type: row.type || 'N/A',
                        Destination: row.destination || '-',
                        Departure: row.departure_time || '-',
                        Return: row.return_time || '-',
                        Status: row.status || '-',
                    })).sort((a, b) =>
                        compareReportRowsByDateThenTime(a, b, { timeKey: 'Departure' }),
                    );
                    summaryRows = { 'Total Trips': (data || []).length };
                    break;
                }
                case 'activities': {
                    const { data } = await supabase
                        .from('activities_field_trips')
                        .select('event_date, title, activity_type, location, time, chaperone')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .gte('event_date', fromDate)
                        .lte('event_date', toDate)
                        .order('event_date', { ascending: false });
                    dataRows = (data || []).map((row: any) => ({
                        Date: row.event_date,
                        Title: row.title || 'N/A',
                        Type: row.activity_type || 'N/A',
                        Location: row.location || '-',
                        Time: formatSportsEventReportTime(row),
                        Staff: row.chaperone || '-',
                    })).sort((a, b) => compareReportRowsByDateThenTime(a, b));
                    summaryRows = { 'Total Activities': (data || []).length };
                    break;
                }
                case 'conflicts': {
                    const { data } = await supabase
                        .from('schedule_conflicts')
                        .select('detected_at, entity_name, entity_type, conflict_type, event1_type, event1_name, event2_type, event2_name, event1_date, resolved, override_reason')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .gte('event1_date', fromDate)
                        .lte('event1_date', toDate)
                        .order('detected_at', { ascending: false });
                    dataRows = (data || []).map((row: any) => ({
                        Detected: row.detected_at ? String(row.detected_at).slice(0, 16).replace('T', ' ') : '-',
                        Entity: row.entity_name || '-',
                        Type: row.entity_type || '-',
                        'Conflict Type': row.conflict_type || '-',
                        'Event 1': `${row.event1_type || ''} - ${row.event1_name || ''}`.trim(),
                        'Event 2': `${row.event2_type || ''} - ${row.event2_name || ''}`.trim(),
                        Date: row.event1_date || '-',
                        Resolved: row.resolved ? 'Yes' : 'No',
                        'Override Reason': row.override_reason || 'N/A',
                    }));
                    summaryRows = {
                        'Total Conflicts': (data || []).length,
                        Unresolved: (data || []).filter((r: any) => !r.resolved).length,
                        Resolved: (data || []).filter((r: any) => r.resolved).length,
                    };
                    break;
                }
                case 'medications': {
                    const expanded = await fetchExpandedMedicationSchedule(
                        supabase,
                        companyId,
                        season,
                        startDate,
                        endDate,
                    );
                    const filtered = expanded.filter((row: any) => {
                        if (selectedDivisionId !== 'all') {
                            return row.children?.division_id === selectedDivisionId;
                        }
                        if (allowedDivisionIds !== null) {
                            return (
                                row.children?.division_id &&
                                allowedDivisionIds.includes(row.children.division_id)
                            );
                        }
                        return true;
                    });
                    dataRows = filtered.map((row: any) => {
                        const divisionName = row.children?.divisions?.name ?? null;
                        const mealLabel = parseMedicationMealTimeLabels(
                            row.meal_time,
                            divisionName,
                        ).join(', ');
                        return {
                            Date: row._displayDate || row.date,
                            Child: row.children?.name || 'Unknown',
                            Division: divisionName || 'N/A',
                            Medication: row.medication_name || 'N/A',
                            Dosage: row.dosage || 'N/A',
                            'Meal Time': mealLabel || 'N/A',
                            'Scheduled Time': row.scheduled_time || 'N/A',
                            Administered: row.administered ? 'Yes' : 'No',
                            Notes: row.notes || '',
                        };
                    });
                    const uniqueChildren = new Set(filtered.map((r: any) => r.child_id));
                    const uniqueMeds = new Set(filtered.map((r: any) => r.medication_name));
                    summaryRows = {
                        'Total Medication Entries': filtered.length,
                        'Unique Children': uniqueChildren.size,
                        'Different Medications': uniqueMeds.size,
                        Administered: filtered.filter((r: any) => r.administered).length,
                        Pending: filtered.filter((r: any) => !r.administered).length,
                    };
                    break;
                }
                case 'allergies': {
                    const { data } = await supabase
                        .from('children')
                        .select('name, allergies, medical_notes, status, division_id, divisions(name)')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .not('allergies', 'is', null)
                        .neq('allergies', '')
                        .order('name');
                    const filtered = applyDivisionFilter(data || []);
                    dataRows = filtered.map((row: any) => ({
                        Child: row.name,
                        Division: row.divisions?.name || 'No Division',
                        Allergies: row.allergies || 'N/A',
                        'Medical Notes': row.medical_notes || 'None',
                        Status: row.status || 'active',
                    }));
                    summaryRows = {
                        'Total Children with Allergies': filtered.length,
                        Active: filtered.filter((r: any) => r.status === 'active').length,
                    };
                    break;
                }
                case 're_enrollment': {
                    const { data } = await supabase
                        .from('children')
                        .select('person_id, name, season, division_id, divisions(name), grade, gender, session, status')
                        .eq('company_id', companyId)
                        .not('person_id', 'is', null);
                    const filtered = applyDivisionFilter(data || []);
                    const grouped = new Map<string, any>();
                    filtered.forEach((row: any) => {
                        if (!grouped.has(row.person_id)) {
                            grouped.set(row.person_id, {
                                name: row.name,
                                person_id: row.person_id,
                                seasons: new Set<string>(),
                                latestDivision: row.divisions?.name || 'N/A',
                                latestGrade: row.grade || 'N/A',
                                latestSession: row.session || 'N/A',
                                gender: row.gender || 'N/A',
                            });
                        }
                        const ref = grouped.get(row.person_id);
                        if (row.season) ref.seasons.add(row.season);
                        ref.name = row.name;
                        ref.latestDivision = row.divisions?.name || ref.latestDivision;
                        ref.latestGrade = row.grade || ref.latestGrade;
                        ref.latestSession = row.session || ref.latestSession;
                    });
                    dataRows = Array.from(grouped.values()).map((row: any) => {
                        const seasons = Array.from(row.seasons).sort();
                        return {
                            Name: row.name,
                            'Person ID': row.person_id,
                            'Years Attended': seasons.length,
                            Seasons: seasons.join(', '),
                            'Latest Division': row.latestDivision,
                            'Latest Grade': row.latestGrade,
                            Gender: row.gender,
                            'Latest Session': row.latestSession,
                            [`In ${season}`]: seasons.includes(season) ? 'Yes' : 'No',
                        };
                    });
                    summaryRows = {
                        'Total Unique Campers': grouped.size,
                        [`Enrolled in ${season}`]: dataRows.filter((r: any) => r[`In ${season}`] === 'Yes').length,
                    };
                    break;
                }
                case 'appointments': {
                    const { data } = await supabase
                        .from('appointments')
                        .select('appointment_date, appointment_time, appointment_type, provider_name, location, status, outcome, follow_up_required, follow_up_date, notes, child_id, staff_id, child:child_id(name, division_id, divisions(name)), staff:staff_id(name, department)')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .gte('appointment_date', fromDate)
                        .lte('appointment_date', toDate)
                        .order('appointment_date', { ascending: false });
                    const filtered = (data || []).filter((row: any) => {
                        if (selectedDivisionId === 'all') return true;
                        if (row.child_id) return row.child?.division_id === selectedDivisionId;
                        return true;
                    });
                    dataRows = filtered.map((row: any) => ({
                        Date: row.appointment_date,
                        Time: row.appointment_time || 'N/A',
                        Person: row.child?.name || row.staff?.name || 'Unknown',
                        'Person Type': row.child_id ? 'Camper' : 'Staff',
                        Division: row.child?.divisions?.name || row.staff?.department || 'N/A',
                        Type: row.appointment_type || 'N/A',
                        Provider: row.provider_name || 'N/A',
                        Location: row.location || 'N/A',
                        Status: row.status || 'N/A',
                        Outcome: row.outcome || 'N/A',
                        'Follow-up Required': row.follow_up_required ? 'Yes' : 'No',
                        'Follow-up Date': row.follow_up_date || 'N/A',
                        Notes: row.notes || '',
                    }));
                    summaryRows = {
                        'Total Appointments': filtered.length,
                        Scheduled: filtered.filter((r: any) => r.status === 'scheduled').length,
                        Completed: filtered.filter((r: any) => r.status === 'completed').length,
                    };
                    break;
                }
                case 'tshirt_sizes': {
                    let childrenQuery = supabase
                        .from('children')
                        .select('name, tshirt_size, division_id, divisions(name), gender, status')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .eq('status', 'active');

                    // Match web report behavior: users with restricted division access should only
                    // see campers from allowed divisions even when "All Divisions" is selected.
                    if (allowedDivisionIds !== null) {
                        if (allowedDivisionIds.length === 0) {
                            childrenQuery = childrenQuery.in('division_id', ['00000000-0000-0000-0000-000000000000']);
                        } else {
                            childrenQuery = childrenQuery.in('division_id', allowedDivisionIds);
                        }
                    }

                    const { data: children } = await childrenQuery;
                    const { data: staff } = await supabase
                        .from('staff')
                        .select('name, tshirt_size, department, status')
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .eq('status', 'active');
                    const filteredChildren = applyDivisionFilter(children || []);
                    const camperRows = filteredChildren.map((row: any) => ({
                        Name: row.name,
                        Type: 'Camper',
                        Division: row.divisions?.name || 'No Division',
                        'T-Shirt Size': row.tshirt_size || 'Not Set',
                        Gender: row.gender || 'N/A',
                    }));
                    const staffRows = (staff || []).map((row: any) => ({
                        Name: row.name,
                        Type: 'Staff',
                        Division: row.department || 'N/A',
                        'T-Shirt Size': row.tshirt_size || 'Not Set',
                        Gender: 'N/A',
                    }));
                    dataRows = [...camperRows, ...staffRows];
                    const sizeCounts: Record<string, number> = {};
                    dataRows.forEach((row) => {
                        const size = String(row['T-Shirt Size'] || 'Not Set');
                        sizeCounts[size] = (sizeCounts[size] || 0) + 1;
                    });

                    const missingSize = sizeCounts['Not Set'] || 0;
                    const withSizeSet = dataRows.length - missingSize;

                    const sizeBreakdown = Object.fromEntries(
                        Object.entries(sizeCounts)
                            .filter(([size]) => size !== 'Not Set')
                            .sort((a, b) => b[1] - a[1])
                    );

                    summaryRows = {
                        'Total People': dataRows.length,
                        Campers: camperRows.length,
                        Staff: staffRows.length,
                        'With Size Set': withSizeSet,
                        'Missing Size': missingSize,
                        ...sizeBreakdown,
                    };
                    break;
                }
            }

            setReportData(dataRows);
            setSummary(summaryRows);
            setSortColumn(null);
            setSortDirection('asc');
        } catch (err: any) {
            console.error('Failed loading report data:', err);
            const msg = err?.message || 'Failed loading report';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!companyId || !season) return;
        fetchReportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportType, companyId, season]);

    const sortedData = useMemo(() => {
        if (!reportData.length) return reportData;

        if (reportType === 'sports_events') {
            const direction =
                sortColumn === 'Date' || sortColumn === 'Time' ? sortDirection : 'asc';
            const tiebreakerColumn =
                sortColumn && sortColumn !== 'Date' && sortColumn !== 'Time'
                    ? sortColumn
                    : null;

            return [...reportData].sort((a, b) =>
                compareSportsEventReportRows(a, b, direction, tiebreakerColumn),
            );
        }

        if (
            !sortColumn &&
            reportData[0] &&
            'Date' in reportData[0]
        ) {
            const timeKey =
                'Time' in reportData[0]
                    ? 'Time'
                    : 'Departure' in reportData[0]
                      ? 'Departure'
                      : undefined;

            return [...reportData].sort((a, b) =>
                compareReportRowsByDateThenTime(
                    a,
                    b,
                    timeKey ? { timeKey } : undefined,
                ),
            );
        }

        if (!sortColumn) return reportData;

        return [...reportData].sort((a, b) => {
            const av = a[sortColumn];
            const bv = b[sortColumn];
            const aString = av == null ? '' : String(av);
            const bString = bv == null ? '' : String(bv);
            const isDate = /^\d{4}-\d{2}-\d{2}/.test(aString) && /^\d{4}-\d{2}-\d{2}/.test(bString);
            let cmp = 0;
            if (isDate) {
                cmp = new Date(aString).getTime() - new Date(bString).getTime();
            } else if (!Number.isNaN(Number(aString)) && !Number.isNaN(Number(bString))) {
                cmp = Number(aString) - Number(bString);
            } else {
                cmp = aString.localeCompare(bString, undefined, { sensitivity: 'base' });
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }, [reportData, reportType, sortColumn, sortDirection]);

    const toggleSort = (column: string) => {
        if (sortColumn !== column) {
            setSortColumn(column);
            setSortDirection('asc');
            return;
        }
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    };

    const exportCSV = () => {
        if (!sortedData.length) return;
        const headers = Object.keys(sortedData[0]);
        const rows = sortedData.map((row) => headers.map((h) => `"${sanitizeCell(row[h])}"`).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const fileName = `${reportType}_report_${Date.now()}.csv`;

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }

        alert('CSV export is available on web in this build.');
    };

    const exportPDF = async () => {
        if (!sortedData.length) return;
        if (!(Platform.OS === 'web' && typeof window !== 'undefined')) {
            alert('PDF download is currently supported on web in this build.');
            return;
        }

        const headers = Object.keys(sortedData[0]);
        const body = sortedData.map((row) => headers.map((h) => sanitizeCell(row[h])));
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default as any;

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.text('Master Reporting Center', 14, 14);
        doc.setFontSize(10);
        doc.text(`${currentReportLabel} | ${companySlug || ''} | ${season}`, 14, 20);
        doc.text(
            `Date range: ${startDate || 'All'} - ${endDate || 'All'} | Division: ${selectedDivisionName}`,
            14,
            25
        );

        autoTable(doc, {
            head: [headers],
            body,
            startY: 30,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [37, 99, 235] },
        });

        doc.save(`${reportType}_report_${Date.now()}.pdf`);
    };

    const renderDatePicker = (kind: 'start' | 'end', visible: boolean, onClose: () => void) => {
        const month = kind === 'start' ? startDatePickerMonth : endDatePickerMonth;
        const year = kind === 'start' ? startDatePickerYear : endDatePickerYear;
        const selected = kind === 'start' ? startDate : endDate;

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];

        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const days = last.getDate();
        const prefix = first.getDay();
        const cells: (Date | null)[] = [];
        for (let i = 0; i < prefix; i++) cells.push(null);
        for (let i = 1; i <= days; i++) cells.push(new Date(year, month, i));

        return (
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <Pressable style={styles.modalOverlay} onPress={onClose}>
                    <Pressable style={styles.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.dragger} />
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (kind === 'start') {
                                        if (startDatePickerMonth === 0) {
                                            setStartDatePickerMonth(11);
                                            setStartDatePickerYear(startDatePickerYear - 1);
                                        } else {
                                            setStartDatePickerMonth(startDatePickerMonth - 1);
                                        }
                                    } else {
                                        if (endDatePickerMonth === 0) {
                                            setEndDatePickerMonth(11);
                                            setEndDatePickerYear(endDatePickerYear - 1);
                                        } else {
                                            setEndDatePickerMonth(endDatePickerMonth - 1);
                                        }
                                    }
                                }}
                            >
                                <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{monthNames[month]} {year}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (kind === 'start') {
                                        if (startDatePickerMonth === 11) {
                                            setStartDatePickerMonth(0);
                                            setStartDatePickerYear(startDatePickerYear + 1);
                                        } else {
                                            setStartDatePickerMonth(startDatePickerMonth + 1);
                                        }
                                    } else {
                                        if (endDatePickerMonth === 11) {
                                            setEndDatePickerMonth(0);
                                            setEndDatePickerYear(endDatePickerYear + 1);
                                        } else {
                                            setEndDatePickerMonth(endDatePickerMonth + 1);
                                        }
                                    }
                                }}
                            >
                                <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.datePickerWeekdays}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <Text key={d} style={styles.weekdayText}>{d}</Text>)}
                        </View>
                        <View style={styles.datePickerGrid}>
                            {cells.map((date, idx) => (
                                date ? (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.dateCell, selected === formatDateISO(date) && styles.selectedDateCell]}
                                        onPress={() => {
                                            const iso = formatDateISO(date);
                                            if (kind === 'start') setStartDate(iso);
                                            else setEndDate(iso);
                                            onClose();
                                        }}
                                    >
                                        <Text style={[styles.dateText, selected === formatDateISO(date) && styles.selectedDateText]}>
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                ) : <View key={idx} style={styles.dateCell} />
                            ))}
                        </View>

                        <View style={styles.datePickerActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (kind === 'start') setStartDate('');
                                    else setEndDate('');
                                    onClose();
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    const today = formatDateISO(new Date());
                                    if (kind === 'start') setStartDate(today);
                                    else setEndDate(today);
                                    onClose();
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Today</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    const reportHeaders = sortedData.length ? Object.keys(sortedData[0]) : [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reports</Text>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.subtitle}>View and export comprehensive reports across all modules</Text>

                <StyledCard style={styles.masterCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="document-text" size={22} color={theme.colors.secondary} />
                        <Text style={styles.cardTitle}>Master Reporting Center</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Generate comprehensive reports and export data</Text>

                    <View style={styles.filterSection}>
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Report Type</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setShowReportTypeDropdown(true)}>
                                <Text style={styles.dropdownText}>{currentReportLabel}</Text>
                                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Start Date</Text>
                            <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartDatePicker(true)}>
                                <Text style={[styles.dateInputText, !startDate && styles.placeholder]}>
                                    {startDate ? formatForDisplay(startDate) : 'mm/dd/yyyy'}
                                </Text>
                                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>End Date</Text>
                            <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndDatePicker(true)}>
                                <Text style={[styles.dateInputText, !endDate && styles.placeholder]}>
                                    {endDate ? formatForDisplay(endDate) : 'mm/dd/yyyy'}
                                </Text>
                                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Filter by Division</Text>
                            <TouchableOpacity style={styles.divisionButton} onPress={() => setShowDivisionDropdown(true)}>
                                <Ionicons name="filter-outline" size={18} color={theme.colors.textSecondary} />
                                <Text style={styles.divisionButtonText}>{selectedDivisionName}</Text>
                                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.generateButton} onPress={fetchReportData} disabled={loading}>
                            <Text style={styles.generateButtonText}>{loading ? 'Loading...' : 'Generate Report'}</Text>
                        </TouchableOpacity>
                    </View>

                    {!!Object.keys(summary).length && (
                        <View style={styles.summaryCards}>
                            {Object.entries(summary).map(([label, value]) => (
                                <View key={label} style={styles.summaryCard}>
                                    <Text style={styles.summaryNumber}>{value}</Text>
                                    <Text style={styles.summaryLabel}>{label}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {loading ? (
                        <View style={styles.emptyState}>
                            <ActivityIndicator size="large" color={theme.colors.secondary} />
                            <Text style={styles.emptyStateText}>Loading report...</Text>
                        </View>
                    ) : sortedData.length ? (
                        <View style={styles.resultSection}>
                            <View style={styles.exportRow}>
                                <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
                                    <Ionicons name="download-outline" size={16} color={theme.colors.text} />
                                    <Text style={styles.exportBtnText}>Export CSV</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.exportBtn} onPress={exportPDF}>
                                    <Ionicons name="download-outline" size={16} color={theme.colors.text} />
                                    <Text style={styles.exportBtnText}>Export PDF</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator>
                                <View>
                                    <View style={styles.tableHeaderRow}>
                                        {reportHeaders.map((h) => (
                                            <TouchableOpacity key={h} style={styles.tableHeadCell} onPress={() => toggleSort(h)}>
                                                <Text style={styles.tableHeadText}>{h}</Text>
                                                <Ionicons
                                                    name={
                                                        sortColumn !== h
                                                            ? 'swap-vertical-outline'
                                                            : sortDirection === 'asc'
                                                                ? 'arrow-up-outline'
                                                                : 'arrow-down-outline'
                                                    }
                                                    size={14}
                                                    color={theme.colors.textSecondary}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {sortedData.map((row, idx) => (
                                        <View key={idx} style={styles.tableBodyRow}>
                                            {reportHeaders.map((h) => (
                                                <View key={h} style={styles.tableBodyCell}>
                                                    <Text style={styles.tableBodyText}>{sanitizeCell(row[h])}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
                            <Text style={styles.emptyStateText}>No data available for the selected criteria</Text>
                            <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
                        </View>
                    )}
                </StyledCard>
            </ScrollView>

            {renderDatePicker('start', showStartDatePicker, () => setShowStartDatePicker(false))}
            {renderDatePicker('end', showEndDatePicker, () => setShowEndDatePicker(false))}

            <Modal visible={showReportTypeDropdown} presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined} transparent animationType="slide" onRequestClose={() => setShowReportTypeDropdown(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowReportTypeDropdown(false)}>
                    <Pressable style={styles.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.dragger} />
                        <Text style={styles.modalTitle}>Select Report Type</Text>
                        <FlatList
                            data={reportTypeOptions}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, reportType === item.value && styles.dropdownItemSelected]}
                                    onPress={() => {
                                        setReportType(item.value);
                                        setShowReportTypeDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownItemText, reportType === item.value && styles.dropdownItemTextSelected]}>
                                        {item.label}
                                    </Text>
                                    {reportType === item.value ? <Ionicons name="checkmark" size={18} color={theme.colors.secondary} /> : null}
                                </TouchableOpacity>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={showDivisionDropdown} presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined} transparent animationType="slide" onRequestClose={() => setShowDivisionDropdown(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowDivisionDropdown(false)}>
                    <Pressable style={styles.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.dragger} />
                        <Text style={styles.modalTitle}>Select Division</Text>
                        <FlatList
                            data={[{ id: 'all', name: 'All Divisions' }, ...(divisions as any[])]}
                            keyExtractor={(item: any) => item.id}
                            renderItem={({ item }: any) => (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, selectedDivisionId === item.id && styles.dropdownItemSelected]}
                                    onPress={() => {
                                        setSelectedDivisionId(item.id);
                                        setShowDivisionDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownItemText, selectedDivisionId === item.id && styles.dropdownItemTextSelected]}>
                                        {item.name}
                                    </Text>
                                    {selectedDivisionId === item.id ? <Ionicons name="checkmark" size={18} color={theme.colors.secondary} /> : null}
                                </TouchableOpacity>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.md, paddingBottom: 24 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    headerTitle: { ...theme.typography.h2 },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    masterCard: { marginBottom: theme.spacing.lg },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs, gap: 8 },
    cardTitle: { ...theme.typography.h3 },
    cardSubtitle: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
    filterSection: { marginBottom: theme.spacing.md },
    filterItem: { marginBottom: 10 },
    filterLabel: { ...theme.typography.bodySmall, fontWeight: '600', marginBottom: 6, color: theme.colors.text },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        minHeight: 42,
        backgroundColor: theme.colors.surface,
    },
    dropdownText: { ...theme.typography.body, flex: 1 },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        minHeight: 42,
        backgroundColor: theme.colors.surface,
    },
    dateInputText: { ...theme.typography.body, flex: 1 },
    placeholder: { color: theme.colors.textSecondary },
    divisionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        minHeight: 42,
        backgroundColor: theme.colors.surface,
    },
    divisionButtonText: { ...theme.typography.body, flex: 1, marginLeft: 8 },
    generateButton: {
        marginTop: 6,
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    generateButtonText: { ...theme.typography.body, color: '#fff', fontWeight: '700' },
    summaryCards: { gap: 10, marginBottom: theme.spacing.md },
    summaryCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 14,
    },
    summaryNumber: { fontSize: 30, fontWeight: '700', color: theme.colors.text },
    summaryLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginTop: 2 },
    resultSection: { gap: 10 },
    exportRow: { flexDirection: 'row', gap: 10 },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    exportBtnText: { ...theme.typography.body, fontWeight: '600' },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, overflow: 'hidden' },
    tableHeadCell: {
        minWidth: 140,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
    },
    tableHeadText: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.text },
    tableBodyRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tableBodyCell: { minWidth: 140, paddingHorizontal: 12, paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#f1f5f9' },
    tableBodyText: { ...theme.typography.body, color: theme.colors.text },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
    emptyStateText: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center' },
    emptyStateSubtext: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, textAlign: 'center' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bottomSheetContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        width: '100%',
        maxWidth: 640,
        maxHeight: '80%',
        paddingHorizontal: 14,
        paddingBottom: 16,
    },
    dragger: {
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.border,
        alignSelf: 'center',
        marginVertical: 10,
    },
    modalTitle: { ...theme.typography.h3, marginBottom: 8 },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#edf2f7',
    },
    dropdownItemSelected: { backgroundColor: '#eff6ff' },
    dropdownItemText: { ...theme.typography.body, color: theme.colors.text },
    dropdownItemTextSelected: { color: theme.colors.secondary, fontWeight: '700' },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    datePickerWeekdays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    weekdayText: { ...theme.typography.bodySmall, width: 36, textAlign: 'center', fontWeight: '700' },
    datePickerGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    dateCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    selectedDateCell: { backgroundColor: theme.colors.secondary },
    dateText: { ...theme.typography.body, color: theme.colors.text },
    selectedDateText: { color: '#fff', fontWeight: '700' },
    datePickerActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
    datePickerActionText: { ...theme.typography.body, color: theme.colors.secondary, fontWeight: '700' },
});
