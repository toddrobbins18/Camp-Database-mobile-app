import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, TextInput, Modal, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useStaff } from '../api/staff';
import { useSetMedicationAdministration } from '../api/health';
import { useDivisions, useEditCamper } from '../api/campers';
import { useCompany } from '../contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getAwardCategoryChips } from '../lib/awardCategory';
import { formatMedicationMealTimeForDisplay } from '../constants/medicationBedtimeOptions';
import { formatBirthdayDisplay } from '../lib/birthdayDate';
import { formatIsoDateToUs, toIsoDateOrNull } from '../api/staffPayload';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

type TabType =
    | 'overview'
    | 'birthday'
    | 'allergies'
    | 'health-center'
    | 'achievements'
    | 'activities'
    | 'sports-academy'
    | 'incidents'
    | 'appointments';
type BirthdaySubTabType = 'info' | 'party';



export const CamperDetailScreen = ({ route, navigation }: any) => {
    const { camper: camperParam } = route.params || {};
    const { companyId, season, isTimberLakeWest } = useCompany();
    const { data: divisionsData = [] } = useDivisions(companyId);
    const { data: staffLeaders = [] } = useStaff(companyId, season);
    const leaders = staffLeaders.map((s: any) => ({
        id: s.id,
        name: s.name,
        role: s.role || s.staff_type || 'Staff'
    }));

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

    // When navigating from Awards "View Profile" we only get { id, name }. Fetch full child so profile shows all details.
    const { data: fullChild, isLoading: fullChildLoading } = useQuery({
        queryKey: ['child', camperParam?.id],
        queryFn: async () => {
            if (!camperParam?.id) return null;
            const { data, error } = await supabase
                .from('children')
                .select('*, division:divisions(id, name, gender, sort_order), leader:leader_id(id, name, role), bunk:bunk_id(id, bunk_number, bunk_name)')
                .eq('id', camperParam.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!camperParam?.id,
    });
    const camper = fullChild ?? camperParam;

    // Align with web ChildProfile: same child_id set via person_id + real columns title/category/description
    const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
        queryKey: ['camper_awards', camper?.id, (camper as any)?.person_id, companyId],
        queryFn: async () => {
            if (!camper?.id || !companyId) return [];

            let childIds: string[] = [camper.id];
            const personId = (camper as any)?.person_id;
            if (personId) {
                const { data: siblingRows } = await supabase
                    .from('children')
                    .select('id')
                    .eq('person_id', personId)
                    .eq('company_id', companyId);
                if (siblingRows?.length) {
                    childIds = [...new Set(siblingRows.map((c: { id: string }) => c.id))];
                }
            }

            const { data, error } = await supabase
                .from('awards')
                .select('*')
                .eq('company_id', companyId)
                .in('child_id', childIds)
                .order('date', { ascending: false });
            if (error) throw error;

            const seen = new Set<string>();
            const rows = (data || []).filter((a: any) => {
                if (seen.has(a.id)) return false;
                seen.add(a.id);
                return true;
            });

            return rows.map((a: any) => ({
                id: a.id,
                title: a.title || 'Award',
                description: (a.description || '').trim(),
                category: a.category ?? null,
                date: a.date
                    ? new Date(String(a.date).includes('T') ? a.date : `${a.date}T12:00:00`).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                      })
                    : '',
            }));
        },
        enabled: !!camper?.id && !!companyId,
    });

    /** Align with web ChildProfile: sports_academy by child + company (no season filter on profile). */
    const { data: sportsAcademyEnrollments = [], isLoading: sportsAcademyLoading } = useQuery({
        queryKey: ['camper_sports_academy', camper?.id, companyId],
        queryFn: async () => {
            if (!camper?.id || !companyId) return [];
            const { data, error } = await supabase
                .from('sports_academy')
                .select('*')
                .eq('child_id', camper.id)
                .eq('company_id', companyId)
                .order('sport_name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!camper?.id && !!companyId,
    });

    /**
     * Incidents linked via incident_children (same as web ChildProfile).
     * incident_reports.child_id may be null when only the junction table links campers.
     */
    const { data: camperIncidents = [], isLoading: incidentsLoading } = useQuery({
        queryKey: ['camper_incidents', camper?.id, companyId],
        queryFn: async () => {
            if (!camper?.id || !companyId) return [];
            const { data: incidentLinks, error } = await supabase
                .from('incident_children')
                .select(`
                    incident_reports (
                        id,
                        date,
                        type,
                        severity,
                        description,
                        status,
                        reported_by,
                        tags,
                        season,
                        created_at,
                        company_id
                    )
                `)
                .eq('child_id', camper.id);
            if (error) throw error;
            const flat = (incidentLinks || [])
                .map((link: any) => link.incident_reports)
                .filter(Boolean)
                .filter((r: any) => r.company_id === companyId);
            const byId = new Map<string, any>();
            for (const r of flat) {
                if (r?.id && !byId.has(r.id)) byId.set(r.id, r);
            }
            return Array.from(byId.values()).sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
        },
        enabled: !!camper?.id && !!companyId,
    });

    /** Align with web ChildProfile: appointments by child + company. */
    const { data: camperAppointments = [], isLoading: appointmentsLoading } = useQuery({
        queryKey: ['camper_appointments', camper?.id, companyId],
        queryFn: async () => {
            if (!camper?.id || !companyId) return [];
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('child_id', camper.id)
                .eq('company_id', companyId)
                .order('appointment_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!camper?.id && !!companyId,
    });

    /** Web HealthCenterTab parity: admissions + recent medications for this child. */
    const { data: healthAdmissions = [], isLoading: healthAdmissionsLoading } = useQuery({
        queryKey: ['camper_health_admissions', camper?.id, companyId],
        queryFn: async () => {
            if (!camper?.id || !companyId) return [];
            const { data, error } = await supabase
                .from('health_center_admissions')
                .select('*')
                .eq('company_id', companyId)
                .eq('child_id', camper.id)
                .order('admitted_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!camper?.id && !!companyId,
    });

    const { data: healthAdmissionNotes = {} as Record<string, { id: string; note: string; created_at: string }[]> } = useQuery({
        queryKey: ['camper_health_admission_notes', camper?.id, companyId, healthAdmissions.map((a: any) => a.id).join(',')],
        queryFn: async () => {
            if (!companyId || healthAdmissions.length === 0) return {};
            const admissionIds = healthAdmissions.map((a: any) => a.id);
            const { data, error } = await supabase
                .from('health_center_admission_notes')
                .select('id, admission_id, note, created_at')
                .eq('company_id', companyId)
                .in('admission_id', admissionIds)
                .order('created_at', { ascending: true });
            if (error) throw error;
            const grouped: Record<string, { id: string; note: string; created_at: string }[]> = {};
            (data || []).forEach((row: any) => {
                if (!grouped[row.admission_id]) grouped[row.admission_id] = [];
                grouped[row.admission_id].push({
                    id: row.id,
                    note: row.note,
                    created_at: row.created_at,
                });
            });
            return grouped;
        },
        enabled: !!companyId && healthAdmissions.length > 0,
    });

    const { data: healthMedications = [], isLoading: healthMedicationsLoading } = useQuery({
        queryKey: ['camper_health_medications', camper?.id, companyId],
        queryFn: async () => {
            if (!camper?.id || !companyId) return [];
            const { data, error } = await supabase
                .from('medication_logs')
                .select('*')
                .eq('child_id', camper.id)
                .eq('company_id', companyId)
                .order('date', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data || [];
        },
        enabled: !!camper?.id && !!companyId,
    });

    // Fetch bunks for Bunk dropdown in Edit Profile
    const { data: bunksData = [] } = useQuery({
        queryKey: ['bunks', companyId, season],
        queryFn: async () => {
            if (!companyId || !season) return [];
            const { data, error } = await supabase
                .from('bunks')
                .select('id, bunk_number, bunk_name, division_id')
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('is_active', true)
                .order('bunk_number', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId && !!season,
    });

    const editCamperMutation = useEditCamper();
    const setAdministrationMutation = useSetMedicationAdministration();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [activeBirthdaySubTab, setActiveBirthdaySubTab] = useState<BirthdaySubTabType>('info');
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [genderButtonLayout, setGenderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const genderButtonRef = useRef<any>(null);
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [divisionButtonLayout, setDivisionButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const divisionButtonRef = useRef<any>(null);
    const [showBunkDropdown, setShowBunkDropdown] = useState(false);
    const [bunkButtonLayout, setBunkButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const bunkButtonRef = useRef<any>(null);
    const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
    const [leaderButtonLayout, setLeaderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const leaderButtonRef = useRef<any>(null);
    const [showTshirtSizeDropdown, setShowTshirtSizeDropdown] = useState(false);
    const [showBirthdayPartyModal, setShowBirthdayPartyModal] = useState(false);
    const [birthdayPartyFormData, setBirthdayPartyFormData] = useState({
        birthdayPartyType: '',
        birthdayPartyComments: '',
        birthdayCakeMeal: '',
        birthdayCakeType: '',
        birthdayFrostingColors: [] as string[],
        birthdayToppings: [] as string[],
        birthdayCakeAllergies: [] as string[],
        birthdayCakeMessage: '',
    });
    const [editProfileFormData, setEditProfileFormData] = useState({
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
        assignedLeaderId: '',
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

    // Initialize form data when modal opens
    useEffect(() => {
        if (showEditProfileModal && camper) {
            const leaderId = (camper as any).leader_id || (camper as any).assigned_leader || '';
            const leaderMatch = staffLeaders.find((s: any) => String(s?.id) === String(leaderId));
            const leaderDisplay = leaderMatch ? `${leaderMatch.name} - ${leaderMatch.role || leaderMatch.staff_type || 'Staff'}` : '';

            const c = camper as any;
            const toStrArr = (v: unknown): string[] =>
                Array.isArray(v) ? v.map((x) => String(x)) : [];

            setEditProfileFormData({
                name: camper.name || '',
                person_id: c.person_id || c.personId || '',
                age: c.age?.toString() || '',
                dateOfBirth: formatIsoDateToUs(c.dateOfBirth || c.date_of_birth),
                gender: c.gender || '',
                division: camper.division_id || c.division?.id || '',
                bunk: c.bunk_id || c.bunk || '',
                grade: camper.grade || '',
                group: c.group_name || c.group || '',
                season: c.season || '2026',
                assignedLeaderId: leaderId,
                assignedLeader: leaderDisplay,
                tshirtSize: c.tshirt_size || '',
                birthdayPartyType: c.birthday_party_type || c.birthdayPartyType || '',
                birthdayPartyComments: c.birthday_party_comments || c.birthdayPartyComments || '',
                birthdayCakeMeal: c.birthday_cake_meal || c.birthdayCakeMeal || '',
                birthdayCakeType: c.birthday_cake_type || c.birthdayCakeType || '',
                birthdayFrostingColors: toStrArr(c.birthday_frosting_colors ?? c.birthdayFrostingColors),
                birthdayToppings: toStrArr(c.birthday_toppings ?? c.birthdayToppings),
                birthdayCakeAllergies: toStrArr(c.birthday_cake_allergies ?? c.birthdayCakeAllergies),
                birthdayCakeMessage: c.birthday_cake_message || c.birthdayCakeMessage || '',
                guardianEmail: c.guardianEmail || c.guardian_email || '',
                guardianPhone: c.guardianPhone || c.guardian_phone || '',
                emergencyContact: c.emergencyContact || c.emergency_contact || '',
                rfid: c.rfid || '',
                allergies: c.allergies || '',
                medicalNotes: c.medicalNotes || c.medical_notes || '',
            });
        }
    }, [showEditProfileModal, camper, staffLeaders]);

    const tabs = useMemo((): { key: TabType; label: string }[] => {
        const all: { key: TabType; label: string }[] = [
            { key: 'overview', label: 'Overview' },
            { key: 'birthday', label: 'Birthday' },
            { key: 'allergies', label: 'Allergies' },
            { key: 'health-center', label: 'Health Center' },
            { key: 'achievements', label: 'Achievements' },
            { key: 'activities', label: 'Activities' },
            { key: 'sports-academy', label: 'Sports Academy' },
            { key: 'incidents', label: 'Incident Reports' },
            { key: 'appointments', label: 'Appointments' },
        ];
        if (isTimberLakeWest) {
            return all.filter((t) => t.key !== 'sports-academy');
        }
        return all;
    }, [isTimberLakeWest]);

    useEffect(() => {
        if (isTimberLakeWest && activeTab === 'sports-academy') {
            setActiveTab('overview');
        }
    }, [isTimberLakeWest, activeTab]);

    if (!camperParam) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Camper Not Found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isMinimalCamper = camperParam.id && !camperParam.grade && !camperParam.division_id;
    const showProfileLoading = fullChildLoading && isMinimalCamper;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#374151" />
                </TouchableOpacity>
                {showProfileLoading ? (
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>{camperParam.name}</Text>
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />
                    </View>
                ) : (
                <View style={styles.headerContent}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{camper.name}</Text>
                        <Text style={styles.headerSubtitle}>
                            {[
                                camper.grade,
                                (camper as any).division?.name,
                                (camper as any).group_name ? `Team ${(camper as any).group_name}` : null,
                                (camper as any).leader?.name ? `Leader: ${(camper as any).leader.name}` : null,
                            ].filter(Boolean).join(' • ') || '—'}
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setShowEditProfileModal(true)}
                        >
                            <Ionicons name="pencil" size={16} color={theme.colors.surface} />
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        {(() => {
                            const raw = (camper as any)?.status;
                            const normalized = typeof raw === 'string' ? raw.toLowerCase() : 'active';
                            const label =
                                typeof raw === 'string' && raw.trim().length > 0 ? raw : 'Active';
                            const isActive = normalized === 'active';

                            return (
                                <View
                                    style={[
                                        styles.activeBadge,
                                        isActive ? styles.activeBadgeActive : styles.activeBadgeInactive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.activeBadgeText,
                                            isActive ? styles.activeBadgeTextActive : styles.activeBadgeTextInactive,
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>
                </View>
                )}
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsContent}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                activeTab === tab.key && styles.tabActive
                            ]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === tab.key && styles.tabTextActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <View style={styles.tabContent}>
                        <View style={styles.cardsRow}>
                            {/* Personal Information Card */}
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Personal Information</Text>
                                    <Text style={styles.cardDescription}>Basic details and contact information</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.infoGrid}>
                                        <View style={styles.infoGridItem}>
                                            <Text style={styles.infoLabel}>Grade</Text>
                                            <View style={styles.infoValueBox}>
                                                <Text style={styles.infoValueText}>{camper.grade || '-'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoGridItem}>
                                            <Text style={styles.infoLabel}>Gender</Text>
                                            <View style={styles.infoValueBox}>
                                                <Text style={styles.infoValueText}>
                                                    {camper.gender ? camper.gender.charAt(0).toUpperCase() + camper.gender.slice(1) : '-'}
                                                </Text>
                                            </View>
                                        </View>
                                        {((camper as any).division?.name || (camper as any).category) ? (
                                            <View style={styles.infoGridItem}>
                                                <Text style={styles.infoLabel}>Division</Text>
                                                <View style={styles.infoValueBox}>
                                                    <Text style={styles.infoValueText}>
                                                        {(camper as any).division?.name || (camper as any).category}
                                                    </Text>
                                                </View>
                                            </View>
                                        ) : null}
                                        {(camper as any).bunk ? (
                                            <View style={styles.infoGridItem}>
                                                <Text style={styles.infoLabel}>Bunk</Text>
                                                <View style={styles.infoValueBox}>
                                                    <Text style={styles.infoValueText}>
                                                        {(camper as any).bunk?.bunk_name || `Bunk ${(camper as any).bunk?.bunk_number}`}
                                                    </Text>
                                                </View>
                                            </View>
                                        ) : null}
                                        {(camper as any).group_name ? (
                                            <View style={styles.infoGridItem}>
                                                <Text style={styles.infoLabel}>Team</Text>
                                                <View style={styles.infoValueBox}>
                                                    <Text style={styles.infoValueText}>{(camper as any).group_name}</Text>
                                                </View>
                                            </View>
                                        ) : null}
                                        {(camper as any).leader ? (
                                            <View style={styles.infoGridItem}>
                                                <Text style={styles.infoLabel}>Assigned Leader</Text>
                                                <View style={styles.infoValueBox}>
                                                    <Text style={styles.infoValueText}>
                                                        {(camper as any).leader.name}
                                                        {(camper as any).leader.role ? ` (${(camper as any).leader.role})` : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            </StyledCard>

                            {/* Contact Information Card */}
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Contact Information</Text>
                                    <Text style={styles.cardDescription}>Emergency contacts and guardian information</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Guardian Email</Text>
                                        <View style={styles.infoValueBox}>
                                            <Text style={styles.infoValueText}>
                                                {(camper as any).guardianEmail || (camper as any).guardian_email || '-'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Guardian Phone</Text>
                                        <View style={styles.infoValueBox}>
                                            <Text style={styles.infoValueText}>
                                                {(camper as any).guardianPhone || (camper as any).guardian_phone || '-'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </StyledCard>
                        </View>
                    </View>
                )}

                {activeTab === 'birthday' && (
                    <View style={styles.tabContent}>
                        {/* Birthday Sub-tabs */}
                        <View style={styles.subTabsContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.subTabsScroll}
                                contentContainerStyle={styles.subTabsContent}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.subTab,
                                        activeBirthdaySubTab === 'info' && styles.subTabActive
                                    ]}
                                    onPress={() => setActiveBirthdaySubTab('info')}
                                >
                                    <Text style={[
                                        styles.subTabText,
                                        activeBirthdaySubTab === 'info' && styles.subTabTextActive
                                    ]}>
                                        Birthday Info
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.subTab,
                                        activeBirthdaySubTab === 'party' && styles.subTabActive
                                    ]}
                                    onPress={() => setActiveBirthdaySubTab('party')}
                                >
                                    <Text style={[
                                        styles.subTabText,
                                        activeBirthdaySubTab === 'party' && styles.subTabTextActive
                                    ]}>
                                        Party Preferences
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>

                        {/* Birthday Info Sub-tab */}
                        {activeBirthdaySubTab === 'info' && (
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Birthday Information</Text>
                                    <Text style={styles.cardDescription}>Date of birth and age details</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    {(camper as any).dateOfBirth || (camper as any).date_of_birth ? (
                                        <View style={styles.birthdayInfoContainer}>
                                            <View style={styles.birthdayDateBox}>
                                                <View style={styles.birthdayDateContent}>
                                                    <Ionicons name="calendar" size={32} color="#2563eb" />
                                                    <View style={styles.birthdayDateText}>
                                                        <Text style={styles.birthdayDateLabel}>Date of Birth</Text>
                                                        <Text style={styles.birthdayDateValue}>
                                                            {formatBirthdayDisplay((camper as any).dateOfBirth || (camper as any).date_of_birth)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            {(camper as any).age && (
                                                <View style={styles.ageBox}>
                                                    <Text style={styles.ageLabel}>Current Age</Text>
                                                    <Text style={styles.ageValue}>{(camper as any).age} years old</Text>
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={styles.emptyBirthdayState}>
                                            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                                            <Text style={styles.emptyBirthdayText}>No birthday information available</Text>
                                            <Text style={styles.emptyBirthdaySubtext}>Click "Edit Profile" to add date of birth</Text>
                                        </View>
                                    )}
                                </View>
                            </StyledCard>
                        )}

                        {/* Party Preferences Sub-tab */}
                        {activeBirthdaySubTab === 'party' && (
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.cardHeaderLeft}>
                                            <Text style={styles.cardTitle}>Birthday Party Preferences</Text>
                                            <Text style={styles.cardDescription}>Celebration and cake customization details</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.editButtonSmall}
                                            onPress={() => {
                                                // Initialize form data from camper
                                                setBirthdayPartyFormData({
                                                    birthdayPartyType: (camper as any).birthdayPartyType || (camper as any).birthday_party_type || '',
                                                    birthdayPartyComments: (camper as any).birthdayPartyComments || (camper as any).birthday_party_comments || '',
                                                    birthdayCakeMeal: (camper as any).birthdayCakeMeal || (camper as any).birthday_cake_meal || '',
                                                    birthdayCakeType: (camper as any).birthdayCakeType || (camper as any).birthday_cake_type || '',
                                                    birthdayFrostingColors: (camper as any).birthdayFrostingColors || (camper as any).birthday_frosting_colors || [],
                                                    birthdayToppings: (camper as any).birthdayToppings || (camper as any).birthday_toppings || [],
                                                    birthdayCakeAllergies: (camper as any).birthdayCakeAllergies || (camper as any).birthday_cake_allergies || [],
                                                    birthdayCakeMessage: (camper as any).birthdayCakeMessage || (camper as any).birthday_cake_message || '',
                                                });
                                                setShowBirthdayPartyModal(true);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={14} color={theme.colors.surface} />
                                            <Text style={styles.editButtonSmallText}>Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.cardContent}>
                                    {((camper as any).birthdayPartyType ||
                                        (camper as any).birthday_party_type ||
                                        (camper as any).birthdayCakeMeal ||
                                        (camper as any).birthday_cake_meal ||
                                        (camper as any).birthdayCakeType ||
                                        (camper as any).birthday_cake_type ||
                                        (camper as any).birthdayPartyComments ||
                                        (camper as any).birthday_party_comments ||
                                        (camper as any).birthdayCakeMessage ||
                                        (camper as any).birthday_cake_message ||
                                        (((camper as any).birthdayFrostingColors || (camper as any).birthday_frosting_colors || []).length > 0) ||
                                        (((camper as any).birthdayToppings || (camper as any).birthday_toppings || []).length > 0) ||
                                        (((camper as any).birthdayCakeAllergies || (camper as any).birthday_cake_allergies || []).length > 0)) ? (
                                        <View style={{ paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md, gap: theme.spacing.md }}>
                                            {(camper as any).birthdayPartyType || (camper as any).birthday_party_type ? (
                                                <Text style={{ fontWeight: '600', color: theme.colors.text }}>
                                                    Party Type: {(camper as any).birthdayPartyType || (camper as any).birthday_party_type}
                                                </Text>
                                            ) : null}
                                            {(camper as any).birthdayCakeMeal || (camper as any).birthday_cake_meal ? (
                                                <Text style={{ color: theme.colors.textSecondary }}>
                                                    Cake Served: {(camper as any).birthdayCakeMeal || (camper as any).birthday_cake_meal}
                                                </Text>
                                            ) : null}
                                            {(camper as any).birthdayCakeType || (camper as any).birthday_cake_type ? (
                                                <Text style={{ color: theme.colors.textSecondary }}>
                                                    Cake Type: {(camper as any).birthdayCakeType || (camper as any).birthday_cake_type}
                                                </Text>
                                            ) : null}
                                            {(camper as any).birthdayPartyComments || (camper as any).birthday_party_comments ? (
                                                <Text style={{ color: theme.colors.textSecondary }}>
                                                    Special Requests: {(camper as any).birthdayPartyComments || (camper as any).birthday_party_comments}
                                                </Text>
                                            ) : null}
                                            {(camper as any).birthdayCakeMessage || (camper as any).birthday_cake_message ? (
                                                <Text style={{ color: theme.colors.textSecondary }}>
                                                    Cake Message: {(camper as any).birthdayCakeMessage || (camper as any).birthday_cake_message}
                                                </Text>
                                            ) : null}
                                        </View>
                                    ) : (
                                        <View style={styles.emptyPartyState}>
                                            <Text style={styles.emptyPartyText}>No party preferences set</Text>
                                            <Text style={styles.emptyPartySubtext}>Click 'Edit' to add birthday party details</Text>
                                        </View>
                                    )}
                                </View>
                            </StyledCard>
                        )}
                    </View>
                )}

                {activeTab === 'allergies' && (
                    <View style={styles.tabContent}>
                        <StyledCard style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Allergy Information</Text>
                                <Text style={styles.cardDescription}>Manage allergy information for this child</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.allergyInputContainer}>
                                    <TextInput
                                        style={styles.allergyTextArea}
                                        placeholder="Enter allergy information (e.g., peanuts, dairy, shellfish...)"
                                        placeholderTextColor="#9ca3af"
                                        multiline
                                        numberOfLines={8}
                                        textAlignVertical="top"
                                        defaultValue={(camper as any).allergies || ''}
                                    />
                                </View>
                                <TouchableOpacity style={styles.saveButton}>
                                    <Text style={styles.saveButtonText}>Save Allergies</Text>
                                </TouchableOpacity>
                            </View>
                        </StyledCard>
                    </View>
                )}

                {activeTab === 'health-center' && (
                    <View style={styles.tabContent}>
                        {(healthAdmissionsLoading || healthMedicationsLoading) && (
                            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                            </View>
                        )}
                        {!healthAdmissionsLoading && !healthMedicationsLoading && (
                            <>
                                {(() => {
                                    const currentAdmission = healthAdmissions.find((a: any) => !a.checked_out_at);
                                    const pastAdmissions = healthAdmissions.filter((a: any) => !!a.checked_out_at);
                                    const camperDivName =
                                        ((camper as any)?.division?.name as string | undefined) ??
                                        ((camper as any)?.group_name as string | undefined) ??
                                        null;

                                    const getAdmissionDuration = (admittedAt: string, checkedOutAt?: string | null) => {
                                        const start = new Date(admittedAt);
                                        const end = checkedOutAt ? new Date(checkedOutAt) : new Date();
                                        const diffMs = end.getTime() - start.getTime();
                                        const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                                    };

                                    const renderAdmissionNotes = (
                                        admissionId: string,
                                        initialNotes?: string | null,
                                    ) => {
                                        const extraNotes = healthAdmissionNotes[admissionId] || [];
                                        if (!initialNotes && extraNotes.length === 0) return null;
                                        return (
                                            <View style={[styles.healthCenterField, styles.healthCenterFieldWide]}>
                                                <Text style={styles.healthCenterFieldLabel}>Notes</Text>
                                                {initialNotes ? (
                                                    <Text style={styles.healthCenterFieldValue}>{initialNotes}</Text>
                                                ) : null}
                                                {extraNotes.map((note) => (
                                                    <View key={note.id} style={{ marginTop: initialNotes ? 8 : 0 }}>
                                                        <Text style={styles.healthCenterFieldValue}>{note.note}</Text>
                                                        <Text style={styles.healthHistoryReason}>
                                                            {new Date(note.created_at).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: 'numeric',
                                                                minute: '2-digit',
                                                            })}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        );
                                    };

                                    return (
                                        <>
                                            {currentAdmission ? (
                                                <StyledCard style={styles.healthCenterActiveCard}>
                                                    <View style={styles.cardHeader}>
                                                        <View style={styles.healthCenterTitleRow}>
                                                            <Ionicons name="medical" size={22} color="#d97706" />
                                                            <Text style={styles.healthCenterActiveTitle}>Currently in Health Center</Text>
                                                        </View>
                                                        <Text style={styles.healthCenterSubMuted}>
                                                            Admitted{' '}
                                                            {new Date(currentAdmission.admitted_at).toLocaleString('en-US', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short',
                                                            })}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.healthCenterGrid}>
                                                        <View style={styles.healthCenterField}>
                                                            <Text style={styles.healthCenterFieldLabel}>Reason</Text>
                                                            <Text style={styles.healthCenterFieldValue}>
                                                                {currentAdmission.reason || 'Not specified'}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.healthCenterField}>
                                                            <Text style={styles.healthCenterFieldLabel}>Duration</Text>
                                                            <Text style={styles.healthCenterFieldValue}>
                                                                {getAdmissionDuration(currentAdmission.admitted_at)}
                                                            </Text>
                                                        </View>
                                                        {renderAdmissionNotes(currentAdmission.id, currentAdmission.notes)}
                                                    </View>
                                                </StyledCard>
                                            ) : (
                                                <StyledCard style={styles.healthCenterSafeCard}>
                                                    <View style={styles.healthCenterNotAdmittedRow}>
                                                        <View style={styles.healthCenterGreenIconWrap}>
                                                            <Ionicons name="checkmark-circle" size={24} color="#059669" />
                                                        </View>
                                                        <View>
                                                            <Text style={styles.healthCenterSafeTitle}>Not currently admitted</Text>
                                                            <Text style={styles.healthCenterSubMuted}>No active Health Center stay</Text>
                                                        </View>
                                                    </View>
                                                </StyledCard>
                                            )}

                                            <StyledCard style={styles.infoCard}>
                                                <View style={styles.cardHeader}>
                                                    <Text style={styles.cardTitle}>Admission history</Text>
                                                    <Text style={styles.cardDescription}>
                                                        {pastAdmissions.length} past visit{pastAdmissions.length === 1 ? '' : 's'}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardContent}>
                                                    {pastAdmissions.length === 0 ? (
                                                        <Text style={styles.emptyPartyText}>No previous Health Center visits</Text>
                                                    ) : (
                                                        <View style={{ gap: 12 }}>
                                                            {pastAdmissions.map((admission: any) => (
                                                                <View key={admission.id} style={styles.healthHistoryRow}>
                                                                    <View style={styles.healthHistoryHeader}>
                                                                        <Text style={styles.healthHistoryDate}>
                                                                            {new Date(admission.admitted_at).toLocaleDateString(
                                                                                'en-US',
                                                                                { month: 'short', day: 'numeric', year: 'numeric' },
                                                                            )}
                                                                        </Text>
                                                                        <View style={styles.healthDurationBadge}>
                                                                            <Text style={styles.healthDurationBadgeText}>
                                                                                {getAdmissionDuration(
                                                                                    admission.admitted_at,
                                                                                    admission.checked_out_at,
                                                                                )}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                    {admission.reason ? (
                                                                        <Text style={styles.healthHistoryReason}>{admission.reason}</Text>
                                                                    ) : null}
                                                                    {renderAdmissionNotes(admission.id, admission.notes)}
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            </StyledCard>

                                            <StyledCard style={styles.infoCard}>
                                                <View style={styles.cardHeader}>
                                                    <Text style={styles.cardTitle}>Medication history</Text>
                                                    <Text style={styles.cardDescription}>Recent medication records</Text>
                                                </View>
                                                <View style={styles.cardContent}>
                                                    {healthMedications.length === 0 ? (
                                                        <Text style={styles.emptyPartyText}>No medication records</Text>
                                                    ) : (
                                                        <View style={{ gap: 12 }}>
                                                            {healthMedications.map((med: any) => {
                                                                const mtLabel = formatMedicationMealTimeForDisplay(
                                                                    med.meal_time,
                                                                    camperDivName,
                                                                );
                                                                const administered = !!med.administered;
                                                                return (
                                                                    <View key={med.id} style={styles.healthHistoryRow}>
                                                                        <View style={styles.healthHistoryHeader}>
                                                                            <Text style={styles.healthMedName}>{med.medication_name}</Text>
                                                                            <View
                                                                                style={[
                                                                                    styles.apptStatusBadge,
                                                                                    administered
                                                                                        ? styles.healthMedBadgeGiven
                                                                                        : styles.apptBadgeOutline,
                                                                                ]}
                                                                            >
                                                                                <Text style={styles.apptStatusText}>
                                                                                    {administered ? 'Administered' : 'Pending'}
                                                                                </Text>
                                                                            </View>
                                                                        </View>
                                                                        <View style={styles.achievementDateContainer}>
                                                                            <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                                                                            <Text style={styles.healthHistoryReason}>
                                                                                {med.date
                                                                                    ? new Date(`${med.date}T12:00:00`).toLocaleDateString(
                                                                                          'en-US',
                                                                                      )
                                                                                    : ''}
                                                                                {med.dosage ? ` · ${med.dosage}` : ''}
                                                                                {mtLabel ? ` · ${mtLabel}` : ''}
                                                                            </Text>
                                                                        </View>
                                                                        {med.notes ? (
                                                                            <Text style={styles.healthHistoryNotes}>{med.notes}</Text>
                                                                        ) : null}
                                                                        <View style={{ marginTop: 8, alignSelf: 'flex-end' }}>
                                                                            <TouchableOpacity
                                                                                onPress={() => {
                                                                                    setAdministrationMutation.mutate({
                                                                                        med,
                                                                                        companyId,
                                                                                        season,
                                                                                        dateString: new Date().toISOString().split('T')[0],
                                                                                        administered: !administered,
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <Text style={{ fontSize: 12, color: administered ? theme.colors.danger : theme.colors.primary, fontWeight: '500' }}>
                                                                                    {administered ? 'Undo Administration' : 'Mark as Administered'}
                                                                                </Text>
                                                                            </TouchableOpacity>
                                                                        </View>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    )}
                                                </View>
                                            </StyledCard>
                                        </>
                                    );
                                })()}
                            </>
                        )}
                    </View>
                )}

                {activeTab === 'achievements' && (
                    <View style={styles.tabContent}>
                        {/* Achievements Count */}
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsCountText}>
                                {achievementsLoading ? 'Loading...' : `${achievements.length} total achievements`}
                            </Text>
                        </View>

                        {/* Achievements List */}
                        {achievementsLoading ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                            </View>
                        ) : achievements.length === 0 ? (
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No awards recorded yet</Text>
                            </StyledCard>
                        ) : (
                            <View style={styles.achievementsList}>
                                {achievements.map((achievement) => {
                                    const categoryChips = getAwardCategoryChips(achievement.category);
                                    return (
                                        <StyledCard key={achievement.id} style={styles.achievementCard}>
                                            <View style={styles.achievementContent}>
                                                <View style={styles.achievementIconContainer}>
                                                    <Ionicons name="trophy" size={24} color="#2563eb" />
                                                </View>
                                                <View style={styles.achievementDetails}>
                                                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                                                    {achievement.description ? (
                                                        <Text style={styles.achievementDescription}>
                                                            {achievement.description}
                                                        </Text>
                                                    ) : null}
                                                    {categoryChips.length > 0 ? (
                                                        <View style={styles.achievementChipRow}>
                                                            {categoryChips.map((chip, idx) => (
                                                                <View
                                                                    key={`${chip.key}-${idx}`}
                                                                    style={
                                                                        chip.variant === 'filled'
                                                                            ? styles.achievementTag
                                                                            : styles.achievementTagOutline
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={
                                                                            chip.variant === 'filled'
                                                                                ? styles.achievementTagText
                                                                                : styles.achievementTagOutlineText
                                                                        }
                                                                    >
                                                                        {chip.text}
                                                                    </Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ) : null}
                                                    <View style={styles.achievementFooter}>
                                                        <View style={styles.achievementDateContainer}>
                                                            <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                                                            <Text style={styles.achievementDate}>{achievement.date}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        </StyledCard>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'activities' && (
                    <View style={styles.tabContent}>
                        {/* Sports Events Section */}
                        <View style={styles.activitiesSection}>
                            <View style={styles.activitiesSectionHeader}>
                                <Ionicons name="trophy" size={20} color="#374151" />
                                <Text style={styles.activitiesSectionTitle}>Sports Events</Text>
                            </View>
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>Not assigned to any sports events</Text>
                            </StyledCard>
                        </View>

                        {/* Field Trips Section */}
                        <View style={styles.activitiesSection}>
                            <View style={styles.activitiesSectionHeader}>
                                <Ionicons name="person" size={20} color="#374151" />
                                <Text style={styles.activitiesSectionTitle}>Field Trips</Text>
                            </View>
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>Not assigned to any field trips</Text>
                            </StyledCard>
                        </View>
                    </View>
                )}

                {activeTab === 'sports-academy' && (
                    <View style={styles.tabContent}>
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsCountText}>
                                {sportsAcademyLoading
                                    ? 'Loading...'
                                    : `${sportsAcademyEnrollments.length} total enrollments`}
                            </Text>
                        </View>

                        {sportsAcademyLoading ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                            </View>
                        ) : sportsAcademyEnrollments.length === 0 ? (
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No sports academy enrollments recorded</Text>
                            </StyledCard>
                        ) : (
                            <View style={styles.achievementsList}>
                                {sportsAcademyEnrollments.map((enrollment: any) => {
                                    const periods: string[] = Array.isArray(enrollment.schedule_periods)
                                        ? enrollment.schedule_periods
                                        : [];
                                    const start = enrollment.start_date;
                                    const end = enrollment.end_date;
                                    const dateLine = (() => {
                                        const fmt = (d: string) =>
                                            new Date(`${d}T00:00:00`).toLocaleDateString('en-US');
                                        if (start && end) return `${fmt(start)} - ${fmt(end)}`;
                                        if (start) return fmt(start);
                                        if (end) return fmt(end);
                                        return '';
                                    })();

                                    return (
                                        <StyledCard key={enrollment.id} style={styles.achievementCard}>
                                            <View style={styles.achievementContent}>
                                                <View style={styles.achievementIconContainer}>
                                                    <Ionicons name="trophy" size={24} color="#2563eb" />
                                                </View>
                                                <View style={styles.achievementDetails}>
                                                    <Text style={styles.achievementTitle}>{enrollment.sport_name}</Text>
                                                    {enrollment.instructor ? (
                                                        <Text style={styles.achievementType}>
                                                            Instructor: {enrollment.instructor}
                                                        </Text>
                                                    ) : null}
                                                    {periods.length > 0 ? (
                                                        <View
                                                            style={[styles.achievementFooter, { marginTop: 8 }]}
                                                        >
                                                            {periods.map((period: string, idx: number) => (
                                                                <View key={`${enrollment.id}-p-${idx}`} style={styles.achievementTag}>
                                                                    <Text style={styles.achievementTagText}>{period}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ) : null}
                                                    {dateLine ? (
                                                        <View style={[styles.achievementDateContainer, { marginTop: 8 }]}>
                                                            <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                                                            <Text style={styles.achievementDate}>{dateLine}</Text>
                                                        </View>
                                                    ) : null}
                                                    {enrollment.notes ? (
                                                        <Text style={[styles.achievementType, { marginTop: 8 }]}>
                                                            {enrollment.notes}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                        </StyledCard>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'incidents' && (
                    <View style={styles.tabContent}>
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsCountText}>
                                {incidentsLoading
                                    ? 'Loading...'
                                    : `${camperIncidents.length} total incident reports`}
                            </Text>
                        </View>

                        {incidentsLoading ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                            </View>
                        ) : camperIncidents.length === 0 ? (
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No incident reports recorded</Text>
                            </StyledCard>
                        ) : (
                            <View style={styles.achievementsList}>
                                {camperIncidents.map((report: any) => {
                                    const sev = String(report.severity || '').toLowerCase();
                                    const iconWrap =
                                        sev === 'high'
                                            ? styles.incidentIconHigh
                                            : sev === 'medium'
                                              ? styles.incidentIconMedium
                                              : styles.incidentIconLow;
                                    const iconColor =
                                        sev === 'high'
                                            ? '#dc2626'
                                            : sev === 'medium'
                                              ? '#d97706'
                                              : '#6b7280';

                                    return (
                                        <StyledCard key={report.id} style={styles.achievementCard}>
                                            <View style={styles.achievementContent}>
                                                <View style={[styles.achievementIconContainer, iconWrap]}>
                                                    <Ionicons name="warning-outline" size={24} color={iconColor} />
                                                </View>
                                                <View style={styles.achievementDetails}>
                                                    <View style={styles.apptTitleRow}>
                                                        <Text style={[styles.achievementTitle, { flex: 1 }]}>
                                                            {report.type || 'Incident'}
                                                        </Text>
                                                        <View style={styles.incidentBadgeRow}>
                                                            {report.severity ? (
                                                                <View
                                                                    style={[
                                                                        styles.incidentSeverityBadge,
                                                                        sev === 'high'
                                                                            ? styles.incidentSevHigh
                                                                            : sev === 'medium'
                                                                              ? styles.incidentSevMedium
                                                                              : styles.incidentSevLow,
                                                                    ]}
                                                                >
                                                                    <Text style={styles.incidentSeverityText}>
                                                                        {report.severity}
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                            {report.status ? (
                                                                <View
                                                                    style={[
                                                                        styles.apptStatusBadge,
                                                                        String(report.status).toLowerCase() === 'open'
                                                                            ? styles.apptBadgeDestructive
                                                                            : String(report.status).toLowerCase() ===
                                                                                'resolved'
                                                                              ? styles.apptBadgeDefault
                                                                              : styles.apptBadgeSecondary,
                                                                    ]}
                                                                >
                                                                    <Text style={styles.apptStatusText}>
                                                                        {report.status}
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                    {report.reported_by ? (
                                                        <Text style={styles.achievementType}>
                                                            Reported by {report.reported_by}
                                                        </Text>
                                                    ) : null}
                                                    {report.description ? (
                                                        <Text style={[styles.achievementType, { marginTop: 8 }]}>
                                                            {report.description}
                                                        </Text>
                                                    ) : null}
                                                    {Array.isArray(report.tags) && report.tags.length > 0 ? (
                                                        <View style={[styles.achievementFooter, { marginTop: 8 }]}>
                                                            {report.tags.map((tag: string, idx: number) => (
                                                                <View
                                                                    key={`${report.id}-tag-${idx}`}
                                                                    style={styles.incidentTagOutline}
                                                                >
                                                                    <Text style={styles.incidentTagOutlineText}>
                                                                        {tag}
                                                                    </Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ) : null}
                                                    {report.date ? (
                                                        <View style={[styles.achievementDateContainer, { marginTop: 8 }]}>
                                                            <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                                                            <Text style={styles.achievementDate}>
                                                                {new Date(`${report.date}T00:00:00`).toLocaleDateString(
                                                                    'en-US',
                                                                )}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        </StyledCard>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'appointments' && (
                    <View style={styles.tabContent}>
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsCountText}>
                                {appointmentsLoading
                                    ? 'Loading...'
                                    : `${camperAppointments.length} total appointments`}
                            </Text>
                        </View>

                        {appointmentsLoading ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                            </View>
                        ) : camperAppointments.length === 0 ? (
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No appointments recorded</Text>
                            </StyledCard>
                        ) : (
                            <View style={styles.achievementsList}>
                                {camperAppointments.map((apt: any) => {
                                    const status = String(apt.status || '').toLowerCase();
                                    const statusStyle =
                                        status === 'completed'
                                            ? styles.apptBadgeSecondary
                                            : status === 'cancelled'
                                              ? styles.apptBadgeDestructive
                                              : status === 'no_show'
                                                ? styles.apptBadgeOutline
                                                : styles.apptBadgeDefault;
                                    const dateStr = apt.appointment_date
                                        ? new Date(`${apt.appointment_date}T00:00:00`).toLocaleDateString(
                                              'en-US',
                                          )
                                        : '';

                                    return (
                                        <StyledCard key={apt.id} style={styles.achievementCard}>
                                            <View style={styles.achievementContent}>
                                                <View style={styles.achievementIconContainer}>
                                                    <Ionicons name="medical-outline" size={24} color="#2563eb" />
                                                </View>
                                                <View style={styles.achievementDetails}>
                                                    <View style={styles.apptTitleRow}>
                                                        <Text style={[styles.achievementTitle, { flex: 1 }]}>
                                                            {apt.appointment_type || 'Appointment'}
                                                        </Text>
                                                        {apt.status ? (
                                                            <View style={[styles.apptStatusBadge, statusStyle]}>
                                                                <Text style={styles.apptStatusText}>{apt.status}</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    {apt.provider_name ? (
                                                        <Text style={styles.achievementType}>{apt.provider_name}</Text>
                                                    ) : null}
                                                    <View style={[styles.achievementDateContainer, { marginTop: 8 }]}>
                                                        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                                                        <Text style={styles.achievementDate}>{dateStr}</Text>
                                                        {apt.appointment_time ? (
                                                            <>
                                                                <Text style={styles.achievementDate}> · </Text>
                                                                <Ionicons
                                                                    name="time-outline"
                                                                    size={14}
                                                                    color="#6b7280"
                                                                />
                                                                <Text style={styles.achievementDate}>
                                                                    {apt.appointment_time}
                                                                </Text>
                                                            </>
                                                        ) : null}
                                                    </View>
                                                    {apt.location ? (
                                                        <View style={[styles.achievementDateContainer, { marginTop: 4 }]}>
                                                            <Ionicons name="location-outline" size={14} color="#6b7280" />
                                                            <Text style={[styles.achievementDate, { flex: 1 }]}>
                                                                {apt.location}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    {apt.notes ? (
                                                        <Text style={[styles.achievementType, { marginTop: 8 }]}>
                                                            {apt.notes}
                                                        </Text>
                                                    ) : null}
                                                    {apt.outcome ? (
                                                        <View style={styles.apptOutcomeBox}>
                                                            <Text style={styles.apptOutcomeLabel}>Outcome: </Text>
                                                            <Text style={styles.apptOutcomeText}>{apt.outcome}</Text>
                                                        </View>
                                                    ) : null}
                                                    {apt.follow_up_required && apt.follow_up_date ? (
                                                        <View style={[styles.achievementTag, { marginTop: 8, alignSelf: 'flex-start' }]}>
                                                            <Text style={styles.achievementTagText}>
                                                                Follow-up:{' '}
                                                                {new Date(`${apt.follow_up_date}T00:00:00`).toLocaleDateString(
                                                                    'en-US',
                                                                )}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        </StyledCard>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditProfileModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEditProfileModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowEditProfileModal(false)}
                >
                    <Pressable
                        style={styles.addChildModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView
                            style={styles.addChildModalScroll}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Modal Header */}
                            <View style={styles.addChildModalHeader}>
                                <Text style={styles.addChildModalTitle}>Edit Child</Text>
                                <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
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
                                            value={editProfileFormData.name}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, name: text })}
                                        />
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Age</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Age"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.age}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, age: text })}
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
                                                if (editProfileFormData.dateOfBirth) {
                                                    const dateParts = editProfileFormData.dateOfBirth.split('/');
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
                                                value={editProfileFormData.dateOfBirth}
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
                                            value={editProfileFormData.person_id}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, person_id: text })}
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
                                                if (genderButtonRef.current) {
                                                    (genderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (genderButtonRef.current) {
                                                    (genderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowGenderDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.gender && styles.formSelectPlaceholder]}>
                                                {editProfileFormData.gender || 'Select gender'}
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
                                                if (divisionButtonRef.current) {
                                                    (divisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (divisionButtonRef.current) {
                                                    (divisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowDivisionDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.division && styles.formSelectPlaceholder]}>
                                                {divisionsData.find(d => d.id === editProfileFormData.division)?.name || 'Select division'}
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
                                                if (bunkButtonRef.current) {
                                                    (bunkButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setBunkButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (bunkButtonRef.current) {
                                                    (bunkButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setBunkButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowBunkDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.bunk && styles.formSelectPlaceholder]}>
                                                {(() => {
                                                    if (!editProfileFormData.bunk) return 'Select bunk';
                                                    const match = bunksData.find((b: any) => b.id === editProfileFormData.bunk);
                                                    return match?.bunk_name || `Bunk ${match?.bunk_number}`;
                                                })()}
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
                                            value={editProfileFormData.grade}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, grade: text })}
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
                                            value={editProfileFormData.group}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, group: text })}
                                        />
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Season (Year)</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="e.g., 2026"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.season}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, season: text })}
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
                                            onPress={() => setShowTshirtSizeDropdown(true)}
                                        >
                                            <Text
                                                style={[
                                                    styles.formSelectText,
                                                    !editProfileFormData.tshirtSize && styles.formSelectPlaceholder
                                                ]}
                                            >
                                                {editProfileFormData.tshirtSize || 'Not Specified'}
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
                                                if (leaderButtonRef.current) {
                                                    (leaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (leaderButtonRef.current) {
                                                    (leaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowLeaderDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.assignedLeader && styles.formSelectPlaceholder]}>
                                                {editProfileFormData.assignedLeader || 'Select a leader'}
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
                                            value={editProfileFormData.guardianEmail}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, guardianEmail: text })}
                                            keyboardType="email-address"
                                        />
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Guardian Phone</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Guardian Phone"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.guardianPhone}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, guardianPhone: text })}
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
                                            value={editProfileFormData.emergencyContact}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, emergencyContact: text })}
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
                                            value={editProfileFormData.rfid}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, rfid: text })}
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
                                            value={editProfileFormData.allergies}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, allergies: text })}
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
                                            value={editProfileFormData.medicalNotes}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, medicalNotes: text })}
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>

                                {/* Birthday Party Preferences — same fields as Camper list “Edit Child” modal */}
                                <View style={styles.editProfileBirthdaySection}>
                                    <Text style={styles.editProfileSectionHeading}>Birthday Party Preferences</Text>

                                    <Text style={styles.editProfileSectionSubheading}>Birthday Celebration Choice</Text>
                                    <View style={styles.radioGroup}>
                                        {[
                                            { value: '', label: 'None' },
                                            { value: 'pizza_soda', label: 'Pizza & Soda Party at Rec Hall' },
                                            { value: 'ice_cream', label: 'Ice Cream Party in the Canteen' },
                                            { value: 'cookies_movie', label: 'Reggies Cookies and Bunk Movie' },
                                            { value: 'campfire_smores', label: 'Campfire and S\'mores' },
                                        ].map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value || 'none'}
                                                style={styles.radioOption}
                                                onPress={() =>
                                                    setEditProfileFormData({ ...editProfileFormData, birthdayPartyType: opt.value })
                                                }
                                            >
                                                <View style={styles.radioButton}>
                                                    {editProfileFormData.birthdayPartyType === opt.value && (
                                                        <View style={styles.radioButtonInner} />
                                                    )}
                                                </View>
                                                <Text style={styles.radioLabel}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.editProfileSectionSubheading}>Additional Comments</Text>
                                    <TextInput
                                        style={styles.formTextArea}
                                        placeholder="Any special requests (e.g., campfire location, timing, number of people in bunk)"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={editProfileFormData.birthdayPartyComments}
                                        onChangeText={(text) =>
                                            setEditProfileFormData({ ...editProfileFormData, birthdayPartyComments: text })
                                        }
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />

                                    <Text style={styles.editProfileSectionSubheading}>When do you want the cake served?</Text>
                                    <View style={styles.radioGroup}>
                                        {[
                                            { value: '', label: 'None' },
                                            { value: 'lunch', label: 'Lunch' },
                                            { value: 'dinner', label: 'Dinner' },
                                        ].map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value || 'cake-meal-none'}
                                                style={styles.radioOption}
                                                onPress={() =>
                                                    setEditProfileFormData({ ...editProfileFormData, birthdayCakeMeal: opt.value })
                                                }
                                            >
                                                <View style={styles.radioButton}>
                                                    {editProfileFormData.birthdayCakeMeal === opt.value && (
                                                        <View style={styles.radioButtonInner} />
                                                    )}
                                                </View>
                                                <Text style={styles.radioLabel}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.editProfileSectionSubheading}>Cake Customization</Text>

                                    <Text style={[styles.formLabel, { marginTop: theme.spacing.sm }]}>Cake Type</Text>
                                    <View style={styles.radioGroup}>
                                        {[
                                            { value: 'rice_krispy', label: 'Rice Krispy Sheet Cake' },
                                            { value: 'vanilla', label: 'Vanilla Frosted Cake' },
                                            { value: 'chocolate', label: 'Chocolate Frosted Cake' },
                                        ].map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={styles.radioOption}
                                                onPress={() =>
                                                    setEditProfileFormData({ ...editProfileFormData, birthdayCakeType: opt.value })
                                                }
                                            >
                                                <View style={styles.radioButton}>
                                                    {editProfileFormData.birthdayCakeType === opt.value && (
                                                        <View style={styles.radioButtonInner} />
                                                    )}
                                                </View>
                                                <Text style={styles.radioLabel}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={[styles.formLabel, { marginTop: theme.spacing.sm }]}>
                                        Frosting Color (select all that apply)
                                    </Text>
                                    <View style={styles.checkboxGrid}>
                                        {['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'No Color'].map((color) => {
                                            const value = color.toLowerCase().replace(' ', '_');
                                            const isChecked = editProfileFormData.birthdayFrostingColors.includes(value);
                                            return (
                                                <TouchableOpacity
                                                    key={color}
                                                    style={styles.checkboxOption}
                                                    onPress={() => {
                                                        const next = isChecked
                                                            ? editProfileFormData.birthdayFrostingColors.filter((x) => x !== value)
                                                            : [...editProfileFormData.birthdayFrostingColors, value];
                                                        setEditProfileFormData({ ...editProfileFormData, birthdayFrostingColors: next });
                                                    }}
                                                >
                                                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                        {isChecked && (
                                                            <Ionicons name="checkmark" size={16} color={theme.colors.surface} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.checkboxLabel}>{color}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <Text style={[styles.formLabel, { marginTop: theme.spacing.sm }]}>
                                        Toppings (select all that apply)
                                    </Text>
                                    <View style={styles.checkboxGrid}>
                                        {[
                                            'Rainbow Sprinkles',
                                            'Chocolate Sprinkles',
                                            'Crushed Oreos',
                                            'Sour Patch',
                                            'Marshmallows',
                                            'Graham Crackers',
                                            'Pretzels',
                                            "M&M's",
                                            'Strawberries',
                                            'Blueberries',
                                            'Cookies',
                                            'Cherries',
                                            'Chocolate Syrup',
                                            'Caramel Syrup',
                                            'No Toppings',
                                        ].map((topping) => {
                                            const value = topping.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                            const isChecked = editProfileFormData.birthdayToppings.includes(value);
                                            return (
                                                <TouchableOpacity
                                                    key={topping}
                                                    style={styles.checkboxOption}
                                                    onPress={() => {
                                                        const next = isChecked
                                                            ? editProfileFormData.birthdayToppings.filter((t) => t !== value)
                                                            : [...editProfileFormData.birthdayToppings, value];
                                                        setEditProfileFormData({ ...editProfileFormData, birthdayToppings: next });
                                                    }}
                                                >
                                                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                        {isChecked && (
                                                            <Ionicons name="checkmark" size={16} color={theme.colors.surface} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.checkboxLabel}>{topping}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <Text style={[styles.formLabel, { marginTop: theme.spacing.sm }]}>
                                        Any Allergies? (select all that apply)
                                    </Text>
                                    <View style={styles.checkboxGrid}>
                                        {['Gluten', 'Dairy', 'Sesame', 'Egg', 'Soy', 'Vegan'].map((allergy) => {
                                            const value = allergy.toLowerCase();
                                            const isChecked = editProfileFormData.birthdayCakeAllergies.includes(value);
                                            return (
                                                <TouchableOpacity
                                                    key={allergy}
                                                    style={styles.checkboxOption}
                                                    onPress={() => {
                                                        const next = isChecked
                                                            ? editProfileFormData.birthdayCakeAllergies.filter((a) => a !== value)
                                                            : [...editProfileFormData.birthdayCakeAllergies, value];
                                                        setEditProfileFormData({
                                                            ...editProfileFormData,
                                                            birthdayCakeAllergies: next,
                                                        });
                                                    }}
                                                >
                                                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                        {isChecked && (
                                                            <Ionicons name="checkmark" size={16} color={theme.colors.surface} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.checkboxLabel}>{allergy}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <Text style={[styles.formLabel, { marginTop: theme.spacing.sm }]}>
                                        What do you want written on the cake?
                                    </Text>
                                    <TextInput
                                        style={styles.formTextArea}
                                        placeholder="Enter custom message for the cake"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={editProfileFormData.birthdayCakeMessage}
                                        onChangeText={(text) =>
                                            setEditProfileFormData({ ...editProfileFormData, birthdayCakeMessage: text })
                                        }
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                </View>

                                {/* Form Buttons */}
                                <View style={styles.formButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setShowEditProfileModal(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={() => {
                                            if (!companyId || !camper?.id) return;

                                            const ageNumber = editProfileFormData.age
                                                ? Number(editProfileFormData.age)
                                                : null;
                                            const age =
                                                typeof ageNumber === 'number' && !Number.isNaN(ageNumber)
                                                    ? ageNumber
                                                    : null;

                                            editCamperMutation.mutate(
                                                {
                                                    id: camper.id,
                                                    company_id: companyId as string,
                                                    season: editProfileFormData.season || season,
                                                    name: editProfileFormData.name,
                                                    age,
                                                    gender: editProfileFormData.gender || null,
                                                    division_id: editProfileFormData.division || null,
                                                    bunk_id:
                                                        editProfileFormData.bunk &&
                                                        /^[0-9a-f-]{36}$/i.test(editProfileFormData.bunk)
                                                            ? editProfileFormData.bunk
                                                            : null,
                                                    person_id: editProfileFormData.person_id,
                                                    grade: editProfileFormData.grade || null,
                                                    group_name: editProfileFormData.group || null,
                                                    guardian_email: editProfileFormData.guardianEmail || null,
                                                    guardian_phone: editProfileFormData.guardianPhone || null,
                                                    emergency_contact: editProfileFormData.emergencyContact || null,
                                                    rfid: editProfileFormData.rfid || null,
                                                    allergies: editProfileFormData.allergies || null,
                                                    medical_notes: editProfileFormData.medicalNotes || null,
                                                    leader_id: editProfileFormData.assignedLeaderId || null,
                                                    date_of_birth: toIsoDateOrNull(editProfileFormData.dateOfBirth),
                                                    tshirt_size: editProfileFormData.tshirtSize || null,
                                                    birthday_party_type: editProfileFormData.birthdayPartyType || null,
                                                    birthday_party_comments: editProfileFormData.birthdayPartyComments || null,
                                                    birthday_cake_meal: editProfileFormData.birthdayCakeMeal || null,
                                                    birthday_cake_type: editProfileFormData.birthdayCakeType || null,
                                                    birthday_frosting_colors:
                                                        editProfileFormData.birthdayFrostingColors.length > 0
                                                            ? editProfileFormData.birthdayFrostingColors
                                                            : null,
                                                    birthday_toppings:
                                                        editProfileFormData.birthdayToppings.length > 0
                                                            ? editProfileFormData.birthdayToppings
                                                            : null,
                                                    birthday_cake_allergies:
                                                        editProfileFormData.birthdayCakeAllergies.length > 0
                                                            ? editProfileFormData.birthdayCakeAllergies
                                                            : null,
                                                    birthday_cake_message: editProfileFormData.birthdayCakeMessage || null,
                                                },
                                                {
                                                    onError: (error: any) => {
                                                        console.error('Failed to update camper:', error);
                                                    }
                                                }
                                            );

                                            setShowEditProfileModal(false);
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

            {/* Date Picker Modal */}
            <Modal
                visible={isDatePickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsDatePickerVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsDatePickerVisible(false)}>
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
                        <ScrollView style={styles.datePickerDaysContainer} showsVerticalScrollIndicator={true}>
                            <View style={styles.datePickerDaysGrid}>
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
                                                    setEditProfileFormData({
                                                        ...editProfileFormData,
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
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Gender Dropdown Modal */}
            <Modal
                visible={showGenderDropdown}
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGenderDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowGenderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Gender</Text>
                            <TouchableOpacity onPress={() => setShowGenderDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {['Male', 'Female'].map((gender) => (
                                <Pressable
                                    key={gender}
                                    style={[
                                        styles.dropdownItem,
                                        editProfileFormData.gender === gender && styles.genderDropdownItemSelected
                                    ]}
                                    onPress={() => {
                                        setEditProfileFormData({ ...editProfileFormData, gender });
                                        setShowGenderDropdown(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        editProfileFormData.gender === gender && styles.genderDropdownItemTextSelected
                                    ]}>
                                        {gender}
                                    </Text>
                                    {editProfileFormData.gender === gender && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Division Dropdown Modal */}
            <Modal
                visible={showDivisionDropdown}
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDivisionDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowDivisionDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {divisionsData.map((division: any) => (
                                <Pressable
                                    key={division.id}
                                    style={[
                                        styles.dropdownItem,
                                        editProfileFormData.division === division.id && styles.genderDropdownItemSelected
                                    ]}
                                    onPress={() => {
                                        setEditProfileFormData({ ...editProfileFormData, division: division.id });
                                        setShowDivisionDropdown(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        editProfileFormData.division === division.id && styles.genderDropdownItemTextSelected
                                    ]}>
                                        {division.name}
                                    </Text>
                                    {editProfileFormData.division === division.id && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Bunk Dropdown Modal */}
            <Modal
                visible={showBunkDropdown}
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowBunkDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowBunkDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Bunk</Text>
                            <TouchableOpacity onPress={() => setShowBunkDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            <Pressable
                                style={[
                                    styles.dropdownItem,
                                    (!editProfileFormData.bunk || editProfileFormData.bunk === 'No Bunk Assigned') && styles.genderDropdownItemSelected
                                ]}
                                onPress={() => {
                                    // Empty string represents "No Bunk Assigned"
                                    setEditProfileFormData({ ...editProfileFormData, bunk: '' });
                                    setShowBunkDropdown(false);
                                }}
                            >
                                <Text style={[
                                    styles.dropdownItemText,
                                    (!editProfileFormData.bunk || editProfileFormData.bunk === 'No Bunk Assigned') && styles.genderDropdownItemTextSelected
                                ]}>
                                    No Bunk Assigned
                                </Text>
                                {(!editProfileFormData.bunk || editProfileFormData.bunk === 'No Bunk Assigned') && (
                                    <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                )}
                            </Pressable>

                            {bunksData.map((bunk: any) => {
                                const label = bunk?.bunk_name || `Bunk ${bunk?.bunk_number}`;
                                const isSelected = editProfileFormData.bunk === bunk?.id;
                                return (
                                    <Pressable
                                        key={bunk.id}
                                        style={[
                                            styles.dropdownItem,
                                            isSelected && styles.genderDropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setEditProfileFormData({ ...editProfileFormData, bunk: bunk.id });
                                            setShowBunkDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                isSelected && styles.genderDropdownItemTextSelected
                                            ]}
                                        >
                                            {label}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* T-Shirt Size Dropdown Modal */}
            <Modal
                visible={showTshirtSizeDropdown}
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTshirtSizeDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowTshirtSizeDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select T-Shirt Size</Text>
                            <TouchableOpacity onPress={() => setShowTshirtSizeDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {tshirtSizeOptions.map((opt) => {
                                const isSelected = editProfileFormData.tshirtSize === opt.value;
                                return (
                                    <Pressable
                                        key={opt.value || 'none'}
                                        style={[
                                            styles.dropdownItem,
                                            isSelected && styles.genderDropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setEditProfileFormData({ ...editProfileFormData, tshirtSize: opt.value });
                                            setShowTshirtSizeDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                isSelected && styles.genderDropdownItemTextSelected
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Assigned Leader Dropdown Modal */}
            < Modal
                visible={showLeaderDropdown}
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLeaderDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowLeaderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Assigned Leader</Text>
                            <TouchableOpacity onPress={() => setShowLeaderDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {leaders.map((leader: any) => {
                                const leaderDisplay = `${leader.name} - ${leader.role}`;
                                const isSelected = editProfileFormData.assignedLeaderId === leader.id || editProfileFormData.assignedLeader === leaderDisplay;
                                return (
                                    <Pressable
                                        key={leader.id}
                                        style={[
                                            styles.dropdownItem,
                                            isSelected && styles.genderDropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setEditProfileFormData({
                                                ...editProfileFormData,
                                                assignedLeader: leaderDisplay,
                                                assignedLeaderId: leader.id
                                            });
                                            setShowLeaderDropdown(false);
                                        }}
                                    >
                                        <View style={styles.leaderItemContent}>
                                            <Text style={[
                                                styles.dropdownItemText,
                                                isSelected && styles.genderDropdownItemTextSelected
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
                                            <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Birthday Party Preferences Modal */}
            {/* Birthday Party Preferences Modal */}
            <Modal
                visible={showBirthdayPartyModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowBirthdayPartyModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowBirthdayPartyModal(false)}
                >
                    <Pressable
                        style={styles.addChildModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView
                            style={styles.addChildModalScroll}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Modal Header */}
                            <View style={styles.addChildModalHeader}>
                                <Text style={styles.addChildModalTitle}>Birthday Party Preferences</Text>
                                <TouchableOpacity onPress={() => setShowBirthdayPartyModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Form Fields */}
                            <View style={styles.addChildForm}>
                                {/* Birthday Celebration Choice */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Birthday Celebration Choice</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: '', label: 'None' },
                                                { value: 'pizza_soda', label: 'Pizza & Soda Party at Rec Hall' },
                                                { value: 'ice_cream', label: 'Ice Cream Party in the Canteen' },
                                                { value: 'cookies_movie', label: 'Reggies Cookies and Bunk Movie' },
                                                { value: 'campfire_smores', label: 'Campfire and S\'mores' },
                                            ].map((option) => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayPartyType: option.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {birthdayPartyFormData.birthdayPartyType === option.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{option.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {/* Additional Comments */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Additional Comments</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Any special requests (e.g., campfire location, timing, number of people in bunk)"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={birthdayPartyFormData.birthdayPartyComments}
                                            onChangeText={(text) => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayPartyComments: text })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>

                                {/* When do you want the cake served? */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>When do you want the cake served?</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: '', label: 'None' },
                                                { value: 'lunch', label: 'Lunch' },
                                                { value: 'dinner', label: 'Dinner' },
                                            ].map((option) => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayCakeMeal: option.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {birthdayPartyFormData.birthdayCakeMeal === option.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{option.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {/* Cake Customization Section */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <View style={styles.sectionDivider} />
                                        <Text style={styles.sectionTitle}>Cake Customization</Text>

                                        {/* Cake Type */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Cake Type (select one)</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: 'rice_krispy', label: 'Rice Krispy Sheet Cake' },
                                                { value: 'vanilla', label: 'Vanilla Frosted Cake' },
                                                { value: 'chocolate', label: 'Chocolate Frosted Cake' },
                                            ].map((option) => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayCakeType: option.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {birthdayPartyFormData.birthdayCakeType === option.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{option.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {/* Frosting Color */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Frosting Color (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'No Color'].map((color) => {
                                                const value = color.toLowerCase().replace(' ', '_');
                                                const isChecked = birthdayPartyFormData.birthdayFrostingColors.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={color}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            if (isChecked) {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayFrostingColors: birthdayPartyFormData.birthdayFrostingColors.filter(c => c !== value)
                                                                });
                                                            } else {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayFrostingColors: [...birthdayPartyFormData.birthdayFrostingColors, value]
                                                                });
                                                            }
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

                                        {/* Toppings */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Toppings (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Rainbow Sprinkles', 'Chocolate Sprinkles', 'Crushed Oreos', 'Sour Patch', 'Marshmallows', 'Graham Crackers', 'Pretzels', 'M&M\'s', 'Strawberries', 'Blueberries', 'Cookies', 'Cherries', 'Chocolate Syrup', 'Caramel Syrup', 'No Toppings'].map((topping) => {
                                                const value = topping.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                                const isChecked = birthdayPartyFormData.birthdayToppings.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={topping}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            if (isChecked) {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayToppings: birthdayPartyFormData.birthdayToppings.filter(t => t !== value)
                                                                });
                                                            } else {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayToppings: [...birthdayPartyFormData.birthdayToppings, value]
                                                                });
                                                            }
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

                                        {/* Any Allergies? */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Any Allergies? (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Gluten', 'Dairy', 'Sesame', 'Egg', 'Soy', 'Vegan'].map((allergy) => {
                                                const value = allergy.toLowerCase();
                                                const isChecked = birthdayPartyFormData.birthdayCakeAllergies.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={allergy}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            if (isChecked) {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayCakeAllergies: birthdayPartyFormData.birthdayCakeAllergies.filter(a => a !== value)
                                                                });
                                                            } else {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayCakeAllergies: [...birthdayPartyFormData.birthdayCakeAllergies, value]
                                                                });
                                                            }
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

                                        {/* What do you want written on the cake? */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>What do you want written on the cake?</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Enter custom message for the cake"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={birthdayPartyFormData.birthdayCakeMessage}
                                            onChangeText={(text) => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayCakeMessage: text })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>

                                {/* Form Buttons */}
                                <View style={styles.formButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setShowBirthdayPartyModal(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={() => {
                                            if (!camper?.id || !companyId) return;

                                            const frostingColors =
                                                birthdayPartyFormData.birthdayFrostingColors.length > 0
                                                    ? birthdayPartyFormData.birthdayFrostingColors
                                                    : null;
                                            const toppings =
                                                birthdayPartyFormData.birthdayToppings.length > 0
                                                    ? birthdayPartyFormData.birthdayToppings
                                                    : null;
                                            const cakeAllergies =
                                                birthdayPartyFormData.birthdayCakeAllergies.length > 0
                                                    ? birthdayPartyFormData.birthdayCakeAllergies
                                                    : null;

                                            editCamperMutation.mutate({
                                                id: camper.id,
                                                company_id: companyId as string,
                                                season: (camper as any)?.season || season,
                                                birthday_party_type: birthdayPartyFormData.birthdayPartyType || null,
                                                birthday_cake_meal: birthdayPartyFormData.birthdayCakeMeal || null,
                                                birthday_cake_type: birthdayPartyFormData.birthdayCakeType || null,
                                                birthday_frosting_colors: frostingColors,
                                                birthday_toppings: toppings,
                                                birthday_cake_allergies: cakeAllergies,
                                                birthday_cake_message: birthdayPartyFormData.birthdayCakeMessage || null,
                                                birthday_party_comments: birthdayPartyFormData.birthdayPartyComments || null,
                                            });

                                            setShowBirthdayPartyModal(false);
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 0,
        gap: 16, // gap-4 = 16px to match web
    },
    headerContent: {
        flex: 1,
        marginLeft: 0,
    },
    headerTitleContainer: {
        marginBottom: theme.spacing.md,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: '#2563eb',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    editButtonText: {
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    activeBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 0,
    },
    activeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeBadgeActive: {
        backgroundColor: '#a7f3d0',
    },
    activeBadgeInactive: {
        backgroundColor: '#fee2e2',
    },
    activeBadgeTextActive: {
        color: '#065f46',
    },
    activeBadgeTextInactive: {
        color: '#991b1b',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    tabsContainer: {
        marginBottom: theme.spacing.lg,
    },
    tabsContent: {
        paddingRight: theme.spacing.md,
        paddingLeft: theme.spacing.xs,
    },
    tab: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.sm,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    tabActive: {
        backgroundColor: '#e5e7eb', // Light gray background for active tab on mobile
        borderBottomColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    tabText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#374151', // Dark gray text on light gray background
        fontWeight: '600',
    },
    tabContent: {
        marginTop: 0,
    },
    cardsRow: {
        flexDirection: 'column', // Always stack vertically on mobile
        gap: 24, // gap-6 = 24px to match web
    },
    infoCard: {
        flex: 1,
        marginBottom: 0,
    },
    cardHeader: {
        marginBottom: theme.spacing.md,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    cardContent: {
        gap: 0,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 16, // gap-4 = 16px to match web
        flexWrap: 'wrap',
    },
    infoGridItem: {
        flex: 1,
        minWidth: '45%',
        marginBottom: 0,
    },
    infoRow: {
        marginBottom: 0,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    infoValue: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    infoValueBox: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 44,
        justifyContent: 'center',
        marginTop: 0,
    },
    infoValueText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    emptyCard: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    subTabsContainer: {
        marginBottom: theme.spacing.lg,
    },
    subTabsScroll: {
        marginBottom: 0,
    },
    subTabsContent: {
        paddingRight: theme.spacing.md,
        paddingLeft: theme.spacing.xs,
    },
    subTab: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.sm,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    subTabActive: {
        backgroundColor: '#e5e7eb',
        borderBottomColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    subTabText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    subTabTextActive: {
        color: '#374151',
        fontWeight: '600',
    },
    birthdayInfoContainer: {
        gap: 16,
    },
    birthdayDateBox: {
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    birthdayDateContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    birthdayDateText: {
        flex: 1,
    },
    birthdayDateLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    birthdayDateValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2563eb',
    },
    ageBox: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 16,
    },
    ageLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    ageValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
    },
    emptyBirthdayState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyBirthdayText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 12,
        textAlign: 'center',
    },
    emptyBirthdaySubtext: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
        textAlign: 'center',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },
    cardHeaderLeft: {
        flex: 1,
    },
    editButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2563eb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.md,
    },
    editButtonSmallText: {
        fontSize: 12,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    emptyPartyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyPartyText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
        textAlign: 'center',
    },
    emptyPartySubtext: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
    },
    allergyInputContainer: {
        marginBottom: 16,
    },
    allergyTextArea: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 16,
        fontSize: 14,
        color: '#374151',
        minHeight: 200,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    achievementsHeader: {
        marginBottom: 16,
    },
    achievementsCountText: {
        fontSize: 14,
        color: '#6b7280',
    },
    achievementsList: {
        gap: 16,
    },
    achievementCard: {
        marginBottom: 0,
    },
    achievementContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    achievementIconContainer: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 12,
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    achievementDetails: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    achievementDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
        lineHeight: 20,
    },
    achievementType: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    achievementChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    achievementFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    achievementTag: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    achievementTagOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    achievementTagOutlineText: {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: '500',
    },
    achievementTagText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '500',
    },
    achievementDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    achievementDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    apptTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 4,
    },
    apptStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexShrink: 0,
    },
    apptBadgeDefault: {
        backgroundColor: '#dbeafe',
    },
    apptBadgeSecondary: {
        backgroundColor: '#f3f4f6',
    },
    apptBadgeDestructive: {
        backgroundColor: '#fee2e2',
    },
    apptBadgeOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    apptStatusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
        textTransform: 'capitalize',
    },
    apptOutcomeBox: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    apptOutcomeLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    apptOutcomeText: {
        fontSize: 13,
        color: '#4b5563',
        flex: 1,
    },
    healthCenterActiveCard: {
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fcd34d',
        backgroundColor: '#fffbeb',
    },
    healthCenterSafeCard: {
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#a7f3d0',
        backgroundColor: '#ecfdf5',
    },
    healthCenterTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    healthCenterActiveTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#92400e',
    },
    healthCenterSubMuted: {
        fontSize: 13,
        color: '#6b7280',
    },
    healthCenterNotAdmittedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    healthCenterGreenIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    healthCenterSafeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#065f46',
    },
    healthCenterGrid: {
        gap: 10,
        marginTop: 4,
    },
    healthCenterField: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: '#ffffff',
    },
    healthCenterFieldWide: {
        width: '100%',
    },
    healthCenterFieldLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    healthCenterFieldValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },
    healthHistoryRow: {
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fafafa',
    },
    healthHistoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    healthHistoryDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    healthHistoryReason: {
        fontSize: 13,
        color: '#6b7280',
    },
    healthHistoryNotes: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 6,
        fontStyle: 'italic',
    },
    healthDurationBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    },
    healthDurationBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },
    healthMedName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        flexShrink: 1,
    },
    healthMedBadgeGiven: {
        backgroundColor: '#dcfce7',
        borderWidth: 0,
    },
    incidentIconHigh: {
        backgroundColor: '#fee2e2',
    },
    incidentIconMedium: {
        backgroundColor: '#ffedd5',
    },
    incidentIconLow: {
        backgroundColor: '#f3f4f6',
    },
    incidentBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        justifyContent: 'flex-end',
        flexShrink: 0,
        maxWidth: '52%',
    },
    incidentSeverityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    incidentSevHigh: {
        backgroundColor: '#fee2e2',
    },
    incidentSevMedium: {
        backgroundColor: '#ffedd5',
    },
    incidentSevLow: {
        backgroundColor: '#f3f4f6',
    },
    incidentSeverityText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
        textTransform: 'capitalize',
    },
    incidentTagOutline: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    },
    incidentTagOutlineText: {
        fontSize: 11,
        color: '#374151',
    },
    activitiesSection: {
        marginBottom: 24,
    },
    activitiesSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    activitiesSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    // Edit Profile Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'flex-end',
    },
    addChildModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        maxHeight: '92%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
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
        flex: 1,
        minWidth: isSmallScreen ? '100%' : '45%',
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
    // Birthday Party Preferences Modal Styles
    editProfileBirthdaySection: {
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    editProfileSectionHeading: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    editProfileSectionSubheading: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    sectionDivider: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    radioGroup: {
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
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
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        flex: 1,
    },
    checkboxGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    checkboxOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        width: '48%',
        paddingVertical: theme.spacing.xs,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    checkboxLabel: {
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        flex: 1,
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        paddingBottom: theme.spacing.xl,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
});

